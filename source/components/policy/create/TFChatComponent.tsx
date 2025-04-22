import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';
import fs from 'fs';
import path from 'path';
import { ApplyTemplate } from '../../../lib/env/template/utils.js';
import { PolicyTables } from './PolicyTables.js';
import { generateTerraform } from './TerraformGenerator.js';
import { PolicyData } from './types.js';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';

export const TFChatComponent = () => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<
		Array<{ role: string; content: string }>
	>([]);
	const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
	const [currentResponse, setCurrentResponse] = useState('');
	const [tableData, setTableData] = useState<PolicyData | null>(null);
	const [waitingForApproval, setWaitingForApproval] = useState(false);
	const [terraformOutput, setTerraformOutput] = useState<string | null>(null);
	const [chatEnded, setChatEnded] = useState(false);
	const [inputDisabled, setInputDisabled] = useState(false);
	const [shouldApplyTerraform, setShouldApplyTerraform] = useState(false);
	const [isApplyingTerraform, setIsApplyingTerraform] = useState(false);
	const [terraformSuccess, setTerraformSuccess] = useState(false);
	const { authToken } = useAuth();

	const applyTerraform = useCallback(async () => {
		try {
			if (!terraformOutput) {
				throw new Error('Terraform output is not set');
			}

			setIsApplyingTerraform(true);
			setTerraformSuccess(false);

			// Create a temporary file with the terraform content
			const tempDir = path.join(process.cwd(), 'source', 'templates');
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			const tempFileName = `temp-${Math.random().toString(36).substring(7)}`;
			const tempFilePath = path.join(tempDir, `${tempFileName}.tf`);

			// Write the terraform content to the temporary file
			fs.writeFileSync(tempFilePath, terraformOutput, 'utf-8');

			try {
				// Use the ApplyTemplate function
				const result = await ApplyTemplate(tempFileName, authToken);

				if (result.startsWith('Error')) {
					throw new Error(result);
				}

				setMessages(prevMessages => [
					...prevMessages,
					{ role: 'assistant', content: result },
				]);
				setTerraformSuccess(true);
			} finally {
				// Clean up the temporary file
				if (fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath);
				}
				setIsApplyingTerraform(false);
			}
		} catch (error) {
			console.error('Error applying Terraform:', error);
			setMessages(prevMessages => [
				...prevMessages,
				{
					role: 'assistant',
					content: `Error applying Terraform: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			]);
			setIsApplyingTerraform(false);
			setTerraformSuccess(false);
		}
	}, [terraformOutput, authToken]);

	// Use useEffect to apply Terraform when terraformOutput changes
	useEffect(() => {
		if (terraformOutput && shouldApplyTerraform) {
			applyTerraform();
			setShouldApplyTerraform(false);
		}
	}, [terraformOutput, shouldApplyTerraform, applyTerraform]);

	const handleApprovalResponse = (response: string) => {
		if (response === 'yes' || response === 'y') {
			// Generate Terraform file
			if (tableData) {
				generateTerraform({
					tableData,
					authToken,
					onTerraformGenerated: terraform => {
						setTerraformOutput(terraform);
						setWaitingForApproval(false);
						setTerraformSuccess(true);
						setChatEnded(true);
					},
				});

				// Set flag to apply Terraform
				setShouldApplyTerraform(true);
			}
		} else {
			// End the chat
			setMessages(prevMessages => [
				...prevMessages,
				{
					role: 'assistant',
					content: 'Chat ended. Thank you for using the policy creation tool.',
				},
			]);
			setWaitingForApproval(false);
			setChatEnded(true);
		}
	};

	const sendMessage = async (message: string) => {
		try {
			setIsWaitingForResponse(true);
			setMessages(prevMessages => [
				...prevMessages,
				{ role: 'user', content: message },
			]);
			setTableData(null);
			setTerraformOutput(null);

			const response = await fetch(`${TERRAFORM_PERMIT_URL}/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message }),
			});

			if (!response.ok) {
				throw new Error('Network response was not ok');
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No reader available');
			}

			let accumulatedResponse = '';
			let jsonData = null;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));
							if (data.delta) {
								// Check if the delta is a JSON string
								if (
									data.delta.trim().startsWith('{') &&
									data.delta.trim().endsWith('}')
								) {
									try {
										jsonData = JSON.parse(data.delta);
										setTableData(jsonData);
									} catch {
										// If it's not valid JSON, just add it to the accumulated response
										accumulatedResponse += data.delta;
										setCurrentResponse(accumulatedResponse);
									}
								} else {
									accumulatedResponse += data.delta;
									setCurrentResponse(accumulatedResponse);
								}
							} else if (data.type === 'disable_input') {
								setInputDisabled(true);
							} else if (data.type === 'enable_input') {
								setInputDisabled(false);
							}
						} catch (e) {
							console.error('Error parsing SSE data:', e);
						}
					}
				}
			}

			// If we found JSON data, set it as the table data
			if (jsonData) {
				setTableData(jsonData);
				setWaitingForApproval(true);
			} else {
				// Try to parse JSON from the accumulated response
				try {
					const jsonMatch = accumulatedResponse.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						const jsonStr = jsonMatch[0];
						const policy = JSON.parse(jsonStr);
						setTableData(policy);

						// Only add the message without the JSON part
						const messageWithoutJson = accumulatedResponse
							.replace(/\{[\s\S]*\}/, '')
							.trim();
						setMessages(prevMessages => [
							...prevMessages,
							{ role: 'assistant', content: messageWithoutJson },
						]);

						// Set waiting for approval state
						setWaitingForApproval(true);
					} else {
						// If no JSON found, add the full message
						setMessages(prevMessages => [
							...prevMessages,
							{ role: 'assistant', content: accumulatedResponse },
						]);
					}
				} catch (error) {
					console.error('Error parsing JSON response:', error);
					// If parsing fails, add the full message
					setMessages(prevMessages => [
						...prevMessages,
						{ role: 'assistant', content: accumulatedResponse },
					]);
				}
			}

			setCurrentResponse('');
		} catch (error) {
			console.error('Error sending message:', error);
			setMessages(prevMessages => [
				...prevMessages,
				{
					role: 'assistant',
					content: 'Error: Unable to connect to the server',
				},
			]);
		} finally {
			setIsWaitingForResponse(false);
		}
	};

	const handleSubmit = (value: string) => {
		if (value.trim()) {
			if (waitingForApproval) {
				handleApprovalResponse(value.trim().toLowerCase());
			} else {
				sendMessage(value.trim());
			}
			setInput('');
		}
	};

	return (
		<Box flexDirection="column">
			{messages.map((msg, i) => (
				<Text key={i} color={msg.role === 'user' ? 'blue' : 'green'}>
					{msg.role === 'user' ? 'You: ' : 'Assistant: '}
					{msg.content}
				</Text>
			))}
			{isWaitingForResponse && currentResponse && (
				<Text color="yellow">Assistant: {currentResponse}</Text>
			)}
			{!isWaitingForResponse && tableData && (
				<PolicyTables
					tableData={tableData}
					waitingForApproval={waitingForApproval}
				/>
			)}
			{isApplyingTerraform && (
				<Box>
					<Text color="yellow">
						<Spinner type="dots" /> Applying Terraform plan...
					</Text>
				</Box>
			)}
			{!isApplyingTerraform && terraformSuccess && (
				<Text color="green">
					Assistant: Terraform file generated successfully!
				</Text>
			)}
			{!chatEnded && !inputDisabled && (
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder={
						waitingForApproval
							? "Type 'yes' or 'no'..."
							: 'Type your message...'
					}
				/>
			)}
		</Box>
	);
};

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Table from 'cli-table';
import chalk from 'chalk';
import { useAuth } from '../../AuthProvider.js';
import fs from 'fs';
import path from 'path';

// Define interfaces for the policy data structure
interface Resource {
	name: string;
	actions: string[];
}

interface Permission {
	resource: string;
	actions: string[];
}

interface Role {
	name: string;
	permissions: Permission[];
}

interface PolicyData {
	resources: Resource[];
	roles: Role[];
}

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
	const { authToken } = useAuth();

	const applyTerraform = useCallback(async () => {
		try {
			if (!terraformOutput) {
				throw new Error('Terraform output is not set');
			}

			// Create a temporary file with the terraform content
			const tempDir = path.join(process.cwd(), 'temp');
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}

			const tempFileName = `temp-${Math.random().toString(36).substring(7)}`;
			const tempFilePath = path.join(tempDir, `${tempFileName}.tf`);

			// Write the terraform content to the temporary file
			fs.writeFileSync(tempFilePath, terraformOutput, 'utf-8');

			try {
				// Use a direct approach to apply the Terraform configuration
				const response = await fetch('http://localhost:3000/apply', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-hcl',
						Authorization: authToken,
					},
					body: terraformOutput,
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Server error: ${response.status} - ${errorText}`);
				}

				await response.json();
				setMessages(prevMessages => [
					...prevMessages,
					{ role: 'assistant', content: 'Terraform applied successfully!' },
				]);
			} finally {
				// Clean up the temporary file
				if (fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath);
				}
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
		}
	}, [terraformOutput, authToken]);

	const generateTerraformFile = () => {
		if (!tableData) return;

		const { resources, roles } = tableData;

		// Convert resource names to keys (lowercase, no spaces)
		const resourceKeys = resources.map(r => ({
			...r,
			key: r.name.toLowerCase().replace(/\s+/g, '_'),
		}));

		// Convert role names to keys
		const roleKeys = roles.map(r => ({
			...r,
			key: r.name.toLowerCase().replace(/\s+/g, '_'),
		}));

		const terraform = `terraform {
  required_providers {
    permitio = {
      source  = "registry.terraform.io/permitio/permit-io"
      version = "~> 0.0.14"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = "${authToken}"
}

${resourceKeys
	.map(
		r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  attributes  = {}
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" : { "name" : "${a.charAt(0).toUpperCase() + a.slice(1)}" }`).join(',\n    ')}
  }
}`,
	)
	.join('\n\n')}

${roleKeys
	.map(
		r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions
			.flatMap(p => p.actions.map(a => `"${p.resource.toLowerCase()}:${a}"`))
			.join(',\n    ')}
  ]
  depends_on = [
    ${r.permissions
			.map(
				p =>
					`permitio_resource.${p.resource.toLowerCase().replace(/\s+/g, '_')}`,
			)
			.join(',\n    ')}
  ]
}`,
	)
	.join('\n\n')}
`;

		console.log('Setting terraformOutput to:', terraform);
		// Make sure terraformOutput is a string
		setTerraformOutput(terraform);
		setWaitingForApproval(false);

		// Add message about Terraform file generation
		setMessages(prevMessages => [
			...prevMessages,
			{
				role: 'assistant',
				content: 'Terraform file generated successfully!',
			},
		]);

		// Close the chat
		setChatEnded(true);
	};

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
			generateTerraformFile();

			// Set flag to apply Terraform
			setShouldApplyTerraform(true);
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

			const response = await fetch('http://localhost:3000/chat', {
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

	// Function to render tables from policy data
	const renderTables = () => {
		if (!tableData) return null;

		const { resources, roles } = tableData;

		// Create resources table
		let resourcesTable = null;
		if (resources && resources.length > 0) {
			const table = new Table({
				head: [
					chalk.hex('#00FF00')('Resource Name'),
					chalk.hex('#00FF00')('Actions'),
				],
				colWidths: [20, 40],
			});

			resources.forEach(resource => {
				table.push([resource.name, resource.actions.join(', ')]);
			});

			resourcesTable = table.toString();
		}

		// Create roles table
		let rolesTable = null;
		if (roles && roles.length > 0) {
			const table = new Table({
				head: [
					chalk.hex('#00FF00')('Role Name'),
					chalk.hex('#00FF00')('Permissions'),
				],
				colWidths: [20, 60],
			});

			roles.forEach(role => {
				const permissions = role.permissions
					.map(
						(p: { resource: string; actions: string[] }) =>
							`${p.resource}: ${p.actions.join(', ')}`,
					)
					.join('\n');

				table.push([role.name, permissions]);
			});

			rolesTable = table.toString();
		}

		return (
			<Box flexDirection="column">
				{resourcesTable && (
					<>
						<Text>Resources:</Text>
						<Text>{resourcesTable}</Text>
					</>
				)}
				{rolesTable && (
					<>
						<Text>Roles:</Text>
						<Text>{rolesTable}</Text>
					</>
				)}
				{waitingForApproval && (
					<Text color="yellow">Do you approve this policy? (yes/no)</Text>
				)}
			</Box>
		);
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
			{!isWaitingForResponse && tableData && renderTables()}
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

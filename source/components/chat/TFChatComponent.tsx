import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Table from 'cli-table';
import chalk from 'chalk';

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

	const sendMessage = async (message: string) => {
		try {
			setIsWaitingForResponse(true);
			setMessages(prevMessages => [
				...prevMessages,
				{ role: 'user', content: message },
			]);
			setTableData(null);

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

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = JSON.parse(line.slice(6));
						if (data.delta) {
							accumulatedResponse += data.delta;
							setCurrentResponse(accumulatedResponse);
						}
					}
				}
			}

			// Try to parse JSON from the response
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
			sendMessage(value.trim());
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
			<TextInput
				value={input}
				onChange={setInput}
				onSubmit={handleSubmit}
				placeholder="Type your message..."
			/>
		</Box>
	);
};

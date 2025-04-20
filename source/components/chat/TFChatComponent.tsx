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
	const [waitingForApproval, setWaitingForApproval] = useState(false);
	const [terraformOutput, setTerraformOutput] = useState<string | null>(null);
	const [chatEnded, setChatEnded] = useState(false);

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
  api_key = "" // Set this to Permit.io API key
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
    ${r.permissions.map(p => `"${p.resource.toLowerCase()}:${p.actions.join(',')}"`).join(',\n    ')}
  ]
}`,
	)
	.join('\n\n')}
`;

		setTerraformOutput(terraform);
		setWaitingForApproval(false);

		// Add message about Terraform file generation and close the chat
		setMessages(prevMessages => [
			...prevMessages,
			{
				role: 'assistant',
				content:
					'Terraform file generated successfully! Chat ended. Thank you for using the policy creation tool.',
			},
		]);

		// Close the chat
		setChatEnded(true);
	};

	const handleApprovalResponse = (response: string) => {
		if (response === 'yes' || response === 'y') {
			// Generate Terraform file
			generateTerraformFile();
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

	// Function to render Terraform output
	const renderTerraformOutput = () => {
		if (!terraformOutput) return null;

		return (
			<Box flexDirection="column">
				<Text color="cyan">Terraform Configuration:</Text>
				<Text>{terraformOutput}</Text>
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
			{!isWaitingForResponse && terraformOutput && renderTerraformOutput()}
			{!chatEnded && (
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

import React from 'react';
import { Box, Text } from 'ink';
import Table from 'cli-table';
import chalk from 'chalk';
import { PolicyData } from './types.js';

interface PolicyTablesProps {
	tableData: PolicyData;
	waitingForApproval: boolean;
}

export const PolicyTables: React.FC<PolicyTablesProps> = ({
	tableData,
	waitingForApproval,
}) => {
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

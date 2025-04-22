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

	// Calculate column widths based on content
	const roleColumnWidths = roles.map(r => Math.max(15, r.name.length + 2));

	const table = new Table({
		head: [
			'', // Empty header for resources/actions column
			...roles.map(r => chalk.hex('#FFA500')(r.name)), // Orange color for role names
		],
		colWidths: [30, ...roleColumnWidths],
		chars: {
			top: '─',
			'top-mid': '┬',
			'top-left': '┌',
			'top-right': '┐',
			bottom: '─',
			'bottom-mid': '┴',
			'bottom-left': '└',
			'bottom-right': '┘',
			left: '│',
			'left-mid': '├',
			mid: '─',
			'mid-mid': '┼',
			right: '│',
			'right-mid': '┤',
			middle: '│',
		},
	});

	// Add rows for each resource and its actions
	resources.forEach(resource => {
		// Add resource name in light purple
		table.push([chalk.hex('#9370DB')(resource.name), ...roles.map(() => '')]);

		// Add actions under the resource
		resource.actions.forEach(action => {
			const row = [
				`  ${action}`, // Indent actions
				...roles.map(role => {
					const hasPermission = role.permissions.some(
						p => p.resource === resource.name && p.actions.includes(action),
					);
					return hasPermission ? '✓' : '';
				}),
			];
			table.push(row);
		});
	});

	return (
		<Box flexDirection="column">
			<Text>{table.toString()}</Text>
			{waitingForApproval && (
				<Text color="yellow">Do you approve this policy? (yes/no)</Text>
			)}
		</Box>
	);
};

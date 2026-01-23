import React from 'react';
import { Box, Text } from 'ink';
import Table from 'cli-table3'; // Using cli-table3 for better border support
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

	// 1. DYNAMIC WIDTH CALCULATION: Prevent border breakage
	// We check the length of all resource names and actions to find the perfect fit.
	const allLabels = resources.flatMap(res => [res.name, ...res.actions.map(a => `  ${a}`)]);
	const longestLabel = Math.max(...allLabels.map(l => l.length));
	const firstColWidth = Math.min(50, Math.max(25, longestLabel + 4));

	// Calculate role column widths
	const roleColumnWidths = roles.map(r => Math.max(12, r.name.length + 2));

	const table = new Table({
		head: [
			chalk.cyan('Resource / Action'), 
			...roles.map(r => chalk.hex('#FFA500')(r.name)),
		],
		colWidths: [firstColWidth, ...roleColumnWidths],
		wordWrap: true,
		chars: {
			top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
			bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
			left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
			right: '│', 'right-mid': '┤', middle: '│',
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
					return hasPermission ? chalk.green('✓') : chalk.gray('·');
				}),
			];
			table.push(row);
		});
	});
	return (
		<Box flexDirection="column" marginTop={1}>
			<Text>{table.toString()}</Text>
			{waitingForApproval && (
				<Box marginTop={1}>
					<Text color="yellow">Do you approve this policy? (yes/no)</Text>
				</Box>
			)}
		</Box>
	);
};

import React, { useMemo } from 'react';
import Table from 'cli-table';
import chalk from 'chalk';
import { Text } from 'ink';

interface Props {
	data: object[];
	headers: string[];
	headersHexColor: string;
}

const TableComponent: React.FC<Props> = ({
	data,
	headers,
	headersHexColor,
}) => {
	// Build table string synchronously whenever data/headers/colors change
	const tableString = useMemo(() => {
		if (!data.length || !headers.length) return null;

		// Map rows to objects based on headers
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updatedRows = data.map((item: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const row: Record<string, any> = {};
			headers.forEach(header => {
				row[header] = item[header];
			});
			return row;
		});

		// Calculate column widths based on the longest cell (or header) in each column
		const colWidths = headers.map(header => {
			const allValues = updatedRows.map(r => String(r[header] ?? ''));
			const maxCellLength = Math.max(
				header.length,
				...allValues.map(v => v.length),
			);
			// add a little padding so things don't butt right up against the border
			return maxCellLength + 2;
		});

		// Instantiate cli-table with dynamic widths
		const cliTable = new Table({
			head: headers.map(h => chalk.hex(headersHexColor)(h)),
			colWidths,
		});

		// Push values into table
		updatedRows.forEach(row => {
			const vals = headers.map(h => row[h] ?? '');
			cliTable.push(vals);
		});

		return cliTable.toString();
	}, [data, headers, headersHexColor]);

	if (!tableString) return null;
	return <Text>{tableString}</Text>;
};

export default TableComponent;

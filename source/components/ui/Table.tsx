import React, { useMemo } from 'react';
import Table from 'cli-table';
import chalk from 'chalk';
import { Text } from 'ink';

interface Props {
	data: object[];
	headers: string[];
	headersHexColor: string;
}

const TableComponent: React.FC<Props> = ({ data, headers, headersHexColor }) => {
	if (!data.length || !headers.length) return null;

	// Build table string synchronously whenever data/headers/colors change
	const tableString = useMemo(() => {
		// Map rows to objects based on headers
		const updatedRows = data.map((item: any) => {
			const row: Record<string, any> = {};
			headers.forEach(header => {
				row[header] = item[header];
			});
			return row;
		});

		// Calculate column widths
		const colWidths = headers.map(header => {
			const firstVal = updatedRows[0]?.[header];
			if (typeof firstVal === 'string') {
				return Math.max(header.length * 2, Math.floor(firstVal.length * 1.5));
			}
			return 8;
		});

		// Instantiate cli-table
		const cliTable = new Table({
			head: headers.map(h => chalk.hex(headersHexColor)(h)),
			colWidths,
		});

		// Push values into table
		updatedRows.forEach(row => {
			const vals = headers.map(h => row[h] ?? 'Empty');
			cliTable.push(vals);
		});

		return cliTable.toString();
	}, [data, headers, headersHexColor]);

	return <Text>{tableString}</Text>;
};

export default TableComponent;

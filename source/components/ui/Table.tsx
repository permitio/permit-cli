import { useEffect, useState } from 'react';
import { Text } from 'ink';
import React from 'react';

const TableComponent = ({
	data,
	headers,
}: {
	data: object[];
	headers: string[];
}) => {
	const [tableString, setTableString] = useState<string>('');

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let updatedRows = data.map((item: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let row: any = {};
			headers.map((header: string) => {
				row[header] = item[header];
			});
			return row;
		});

		// Calculate column widths
		const columnWidths = headers.map(header => {
			const headerWidth = header.length;
			const contentWidth = Math.max(
				...updatedRows.map(row => String(row[header] ?? 'Empty').length),
			);
			return Math.max(headerWidth, contentWidth) + 2;
		});

		// Build table string
		let tableStr = '';

		// Headers
		headers.forEach((header, i) => {
			tableStr += header.padEnd(columnWidths[i] ?? 10);
		});
		tableStr += '\n';

		// Separator
		headers.forEach((_, i) => {
			tableStr += '-'.repeat(columnWidths[i] ?? 10);
		});
		tableStr += '\n';

		// Rows
		updatedRows.forEach(row => {
			headers.forEach((header, i) => {
				const value = row[header] ?? 'Empty';
				tableStr += String(value).padEnd(columnWidths[i] ?? 10);
			});
			tableStr += '\n';
		});

		setTableString(tableStr);
	}, [data, headers]);

	return (
		<>
			<Text>{tableString}</Text>
		</>
	);
};

export default TableComponent;

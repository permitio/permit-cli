import { useEffect, useState } from 'react';
import Table from 'cli-table';
import chalk from 'chalk';
import { Text } from 'ink';
import React from 'react';

const TableComponent = ({
	data,
	headers,
	headersHexColor,
}: {
	data: object[];
	headers: string[];
	headersHexColor: string;
}) => {
	const [table, setTable] = useState({});

	useEffect(() => {
		/*
		 *   Build the object bases on the headers string array, the headers for now must
		 *   be the key of the original object - maybe decouple that in the future
		 */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let updatedRows = data.map((item: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let row: any = {};
			headers.map((header: string) => {
				row[header] = item[header];
			});

			return row;
		});
		/* Build the table cli object, generate  the headers,column width and color. */

		/* Calculate column width based on header and content length */
		const columnWidthArray = headers.map((header: string) => {
			if (typeof updatedRows?.[0][header] === 'string') {
				if (header.length > updatedRows?.[0][header].length) {
					return header.length * 2;
				}
				return Math.floor(updatedRows?.[0][header].length * 1.5);
			}
			return 8;
		});

		var table = new Table({
			head: headers.map(item => chalk.hex(headersHexColor)(item)),
			colWidths: columnWidthArray,
		});
		/* Add the rows to the table object	*/
		updatedRows.map((item: object) => {
			let values = Object.values(item);
			table.push(values.map(item => item ?? 'Empty'));
		});

		setTable(table);
	}, [data, headers, headersHexColor]);

	return (
		<>
			<Text>{table.toString()}</Text>
		</>
	);
};

export default TableComponent;

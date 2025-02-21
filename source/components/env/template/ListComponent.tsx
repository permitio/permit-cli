import React from 'react';
import { getFiles } from '../../../lib/env/template/utils.js';
import { Text, Box } from 'ink';

export default function ListComponent() {
	const files = getFiles() || [];

	return (
		<Box paddingLeft={2} flexDirection="column">
			<Text bold underline>
				Templates List
			</Text>
			{files.length > 0 ? (
				files.map((file, index) => <Text key={index}>• {file}</Text>)
			) : (
				<Text>No Templates found.</Text>
			)}
		</Box>
	);
}

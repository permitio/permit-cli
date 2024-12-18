import React from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { ExportState } from '../types.js';

interface ExportStatusProps {
	state: ExportState;
	file?: string;
}

export const ExportStatus: React.FC<ExportStatusProps> = ({ state, file }) => {
	if (state.error) {
		return (
			<>
				<Text color="red">Error: {state.error}</Text>
				{state.warnings.length > 0 && (
					<>
						<Text color="yellow">Warnings:</Text>
						{state.warnings.map((warning, i) => (
							<Text key={i} color="yellow">
								- {warning}
							</Text>
						))}
					</>
				)}
			</>
		);
	}

	if (!state.isComplete) {
		return (
			<>
				<Text>
					<Spinner type="dots" />{' '}
					{state.status || 'Exporting environment configuration...'}
				</Text>
			</>
		);
	}

	return (
		<>
			<Text color="green">Export completed successfully!</Text>
			{file && <Text>HCL content has been saved to: {file}</Text>}
			{state.warnings.length > 0 && (
				<>
					<Text color="yellow">Warnings during export:</Text>
					{state.warnings.map((warning, i) => (
						<Text key={i} color="yellow">
							- {warning}
						</Text>
					))}
				</>
			)}
		</>
	);
};

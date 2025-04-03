import React from 'react';
import { Box, Text } from 'ink';
import { ComparisonResult } from '../auditTypes.js';
import DifferencesView from './DifferencesView.js';

interface ResultsViewProps {
	results: ComparisonResult[];
	pdpUrl: string;
}

const ResultsView: React.FC<ResultsViewProps> = ({ results, pdpUrl }) => {
	// Count matches and mismatches
	const matches = results.filter(r => r.matches).length;
	const mismatches = results.length - matches;
	const errors = results.filter(r => r.error).length;

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text>
					Compared {results.length} audit logs against PDP at {pdpUrl}
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text>
					Results: <Text color="green">{matches} matches</Text>,{' '}
					<Text color={mismatches > 0 ? 'red' : 'green'}>
						{mismatches} differences
					</Text>
					{errors > 0 && <Text color="yellow">, {errors} errors</Text>}
				</Text>
			</Box>

			{mismatches > 0 && (
				<DifferencesView results={results.filter(r => !r.matches)} />
			)}

			{mismatches === 0 && (
				<Text color="green">
					✓ All decisions match! The PDP behaves identically to the audit log
					data.
				</Text>
			)}
		</Box>
	);
};

export default ResultsView;

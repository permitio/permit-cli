import React from 'react';
import { Box, Text } from 'ink';
import { ComparisonResult } from '../auditTypes.js';
import ErrorResultView from './ErrorResultView.js';
import DifferenceResultView from './DifferenceResultView.js';

interface DifferencesViewProps {
	results: ComparisonResult[];
}

const DifferencesView: React.FC<DifferencesViewProps> = ({ results }) => (
	<Box flexDirection="column" marginBottom={1}>
		<Text bold underline>
			Differences found:
		</Text>
		{results.map((result, i) => (
			<Box key={i} flexDirection="column" marginTop={1} paddingLeft={2}>
				{result.error ? (
					<ErrorResultView result={result} />
				) : (
					<DifferenceResultView result={result} />
				)}
			</Box>
		))}
	</Box>
);

export default DifferencesView;

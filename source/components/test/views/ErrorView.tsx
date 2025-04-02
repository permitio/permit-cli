import React from 'react';
import { Box, Text } from 'ink';

interface ErrorViewProps {
	error: string;
	pdpUrl: string;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error, pdpUrl }) => (
	<Box flexDirection="column">
		<Text color="red">Error: {error}</Text>
		<Box marginTop={1}>
			<Text>Troubleshooting tips:</Text>
		</Box>
		<Box paddingLeft={2} flexDirection="column" marginTop={1}>
			<Text>
				1. Ensure you{'\u2019'}re logged in with valid credentials (run{' '}
				{'\u2018'}permit login{'\u2019'})
			</Text>
			<Text>2. Check if you have permission to access audit logs</Text>
			<Text>3. Verify your PDP URL is correct: {pdpUrl}</Text>
			<Text>4. Try with a smaller time frame: --timeFrame 6</Text>
		</Box>
	</Box>
);

export default ErrorView;

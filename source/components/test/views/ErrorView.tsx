import React from 'react';
import { Box, Text } from 'ink';

interface ErrorViewProps {
	error: string;
}

/**
 * Displays the specific error that occurred
 */
const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
	return (
		<Box flexDirection="column">
			<Text color="red">Error: {error}</Text>
		</Box>
	);
};

export default ErrorView;

import React from 'react';
import Gradient from 'ink-gradient';
import { Text, Box, Newline } from 'ink';
import { AuthProvider } from '../components/AuthProvider.js';
import EnvironmentInfo from '../components/EnvironmentInfo.js';

export default function Index() {
	return (
		<AuthProvider skipLogin={true}>
			<Box borderStyle="single" margin={2} flexDirection="column">
				<Text>
					<Gradient colors={['#FF923F', '#944EEF']}>Permit CLI</Gradient> is a
					developer swiss army knife for fine-grained authorization
				</Text>
				<Text>Run this command with --help for more information</Text>
				<Newline count={1} />
				<EnvironmentInfo />
			</Box>
		</AuthProvider>
	);
}

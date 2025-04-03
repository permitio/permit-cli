import React from 'react';
import Gradient from 'ink-gradient';
import { Text, Box, Newline } from 'ink';
import { AuthProvider } from '../components/AuthProvider.js';
import EnvironmentInfo from '../components/EnvironmentInfo.js';
import { argv } from 'node:process';

export default function Index() {
	const args = argv.slice(2);
	const command = args[0] || '';
	const skipLogin = command !== 'login';

	return (
		<AuthProvider skipLogin={skipLogin}>
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

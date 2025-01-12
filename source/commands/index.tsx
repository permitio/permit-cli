import React from 'react';
import Gradient from 'ink-gradient';
import { Text } from 'ink';

export default function Index() {
	return (
		<>
			<Text>
				<Gradient colors={['#FF923F', '#944EEF']}>Permit CLI</Gradient> is a
				developer swiss army knife for fine-grained authorization
			</Text>
			<Text>Run this command with --help for more information</Text>
		</>
	);
}

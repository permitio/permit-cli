import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { Text } from 'ink';

export default function Index() {
	return (
		<>
			<Gradient colors={['#FF923F', '#944EEF']}>
				<BigText text="Permit CLI" />
			</Gradient>
			<Text>Run this command with --help for more information</Text>
		</>
	);
}

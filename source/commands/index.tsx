import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { Text } from 'ink';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('index');

export default function Index() {
	return (
		<>
			<Gradient colors={['#FF923F', '#944EEF']}>
				<BigText text="Permit CLI" />
			</Gradient>
			<Text>{i18n('help.message')}</Text>
		</>
	);
}

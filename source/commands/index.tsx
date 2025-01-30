import React from 'react';
import Gradient from 'ink-gradient';
import { Text } from 'ink';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('index');

export default function Index() {
	return (
		<>
			<Text>
				<Gradient colors={['#FF923F', '#944EEF']}>Permit CLI</Gradient>
				{i18n('title.description')}
			</Text>
			<Text>{i18n('help.message')}</Text>
		</>
	);
}

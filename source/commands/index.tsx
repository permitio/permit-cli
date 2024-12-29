import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { Text } from 'ink';
import i18next from 'i18next';

export default function Index() {
	return (
		<>
			<Gradient colors={['#FF923F', '#944EEF']}>
				<BigText text={i18next.t('indexMessage.appTitle')} />
			</Gradient>
			<Text>{i18next.t('indexMessage.helpMessage')}</Text>
		</>
	);
}

import React, { useEffect, useState } from 'react';
import { Text, Newline } from 'ink';
import zod from 'zod';
import { keyAccountOption } from '../options/keychain.js';
import { KEYSTORE_PERMIT_SERVICE_NAME } from '../config.js';
import keytar from 'keytar';
import i18next from 'i18next';

export const args = zod.tuple([
	zod
		.enum(['save', 'read', 'validate'])
		.describe('Which action to take with the api-key and/or key-store'),
	zod.string().describe('The key to save or validate').default('Undefined'),
]);

export const options = zod.object({
	keyAccount: keyAccountOption,
});

type Props = {
	args: zod.infer<typeof args>;
	options: zod.infer<typeof options>;
};

export default function ApiKey({ args, options }: Props) {
	const action: string = args[0];
	const key: string = args[1];
	const isValid = key.length >= 97 && key.startsWith('permit_key_');

	const [readKey, setReadKey] = useState('');

	useEffect(() => {
		if (action === 'read') {
			keytar
				.getPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount)
				.then(value => setReadKey(value || ''))
				.catch(reason =>
					setReadKey(
						`-- Failed to read key- reason ${reason instanceof Error ? reason.message : String(reason)}`,
					),
				);
		}
	}, [action, options.keyAccount]);

	if (isValid && action === 'save') {
		keytar.setPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount, key);
		return (
			<Text>
				<Text color="green">{i18next.t('apiKeyMessages.keySaved')}</Text>
			</Text>
		);
	} else if (isValid && action === 'validate') {
		return (
			<Text>
				<Text color="green">{i18next.t('apiKeyMessages.keyValid')}</Text>
			</Text>
		);
	} else if (action === 'read') {
		return (
			<Text>
				<Text color="green">{readKey}</Text>
			</Text>
		);
	}
	return (
		<Text>
			<Text color="red">{i18next.t('apiKeyMessages.keyNotValid')}</Text>
			<Newline />
			<Text color="red">
				{i18next.t('apiKeyMessages.providedKey')} {key}
			</Text>
		</Text>
	);
}

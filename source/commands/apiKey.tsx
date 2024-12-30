import React, { useEffect, useState } from 'react';
import { Text, Newline } from 'ink';
import zod from 'zod';
import { keyAccountOption } from '../options/keychain.js';
import { KEYSTORE_PERMIT_SERVICE_NAME } from '../config.js';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('apiKey');

import keytar from 'keytar';

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
				.catch(reason => setReadKey(`-- Failed to read key- reason ${reason}`));
		}
	}, [action, options.keyAccount]);

	if (isValid && action === 'save') {
		keytar.setPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount, key);
		return (
			<Text>
				<Text color="green">{i18n('apiKeySaved.message')}</Text>
			</Text>
		);
	} else if (isValid && action === 'validate') {
		return (
			<Text>
				<Text color="green">{i18n('apiKeyValid.message')}</Text>
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
			<Text color="red">{i18n('apiKeyInvalid.message')}</Text>
			<Newline />
			<Text color="red">{i18n('apiKeyInvalidValue.message', { key })}</Text>
		</Text>
	);
}

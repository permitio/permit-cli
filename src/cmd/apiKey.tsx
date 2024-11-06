import React from 'react';
import { Text, Newline } from 'ink';
import zod from 'zod';
import { keyAccountOption } from '../options/keychain.ts';
import { KEYSTORE_PERMIT_SERVICE_NAME } from '../config/config.ts';

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

export default function apiKey({ args, options }: Props) {
	const action: string = args[0];
	const key: string = args[1];
	const isValid = key.length >= 97 && key.startsWith('permit_key_');

	const [readKey, setReadKey] = React.useState('');

	if (action === 'read') {
		React.useEffect(() => {
			keytar
				.getPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount)
				.then(value => setReadKey(value || ''))
				.catch(reason => setReadKey(`-- Failed to read key- reason ${reason}`));
		}, []);
	}

	if (isValid && action === 'save') {
		keytar.setPassword(KEYSTORE_PERMIT_SERVICE_NAME, options.keyAccount, key);
		return (
			<Text>
				<Text color="green">Key saved to secure key store.</Text>
			</Text>
		);
	} else if (isValid && action === 'validate') {
		return (
			<Text>
				<Text color="green">Key is valid.</Text>
			</Text>
		);
	} else if (action === 'read') {
		return (
			<Text>
				<Text color="green">{readKey}</Text>
			</Text>
		);
	} else {
		return (
			<Text>
				<Text color="red">Key is not valid.</Text>
				<Newline />
				<Text color="red">Provided key: {key}</Text>
			</Text>
		);
	}
}

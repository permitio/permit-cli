import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import CreateComponent from '../../components/env/CreateComponent.js';

export const description = 'Create a new Permit environment';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment creation',
				alias: 'k',
			}),
		),
	name: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment name',
				alias: 'n',
			}),
		),
	envKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment key identifier',
				alias: 'e',
			}),
		),
	description: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment description',
				alias: 'd',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Create({
	options: { key, name, envKey, description },
}: Props) {
	return (
		<AuthProvider permit_key={key} scope={'project'}>
			<CreateComponent name={name} envKey={envKey} description={description} />
		</AuthProvider>
	);
}

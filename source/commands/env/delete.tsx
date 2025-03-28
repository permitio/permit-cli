import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import DeleteComponent from '../../components/env/DeleteComponent.js';

export const description = 'Delete a Permit environment';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment deletion',
				alias: 'k',
			}),
		),
	envId: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment ID to delete',
				alias: 'e',
			}),
		),
	force: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description: 'Skip confirmation prompts and force deletion',
				alias: 'f',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Delete({ options: { apiKey, envId, force } }: Props) {
	return (
		<AuthProvider permit_key={apiKey} scope={'project'}>
			<DeleteComponent environmentId={envId} force={force} />
		</AuthProvider>
	);
}

import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../../components/AuthProvider.js';
import ListComponent from '../../../components/env/template/ListComponent.js';

export const description =
	'A simple command which lists all the terraform templates available.';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment to apply the terraform template.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function List({ options: { apiKey } }: Props) {
	return (
		<>
			<AuthProvider permit_key={apiKey} scope={'environment'}>
				<ListComponent />
			</AuthProvider>
		</>
	);
}

import React from 'react';

import { option } from 'pastel';

import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import SelectComponent from '../../components/env/SelectComponent.js';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment selection. In case not provided, CLI will redirect you to the Login.',
			}),
		),
});

export type EnvSelectProps = {
	readonly options: zInfer<typeof options>;
};

export default function Select({ options }: EnvSelectProps) {
	return (
		<AuthProvider permit_key={options.apiKey} scope={'project'}>
			<SelectComponent key={options.apiKey} />
		</AuthProvider>
	);
}

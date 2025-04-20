import React from 'react';
import { AuthProvider } from '../components/AuthProvider.js';
import { option } from 'pastel';
import zod, { type infer as zInfer } from 'zod';
import InitWizardComponent from '../components/init/InitWizardComponent.js';

export const description =
	'A wizard to take users through all the steps, from configuring policy to enforcing it.';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(option({ description: 'Your Permit.io API key' })),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Init({ options }: Props) {
	return (
		<AuthProvider permit_key={options.apiKey} scope={'environment'}>
			<InitWizardComponent options={options} />
		</AuthProvider>
	);
}

import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { option } from 'pastel';
import zod from 'zod';
import CreateSimpleWizard from '../../../components/policy/CreateSimpleWizard.js';

export const description =
	'Create a new Policy table for Role Based Access Control';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit Environment Organization or Project',
				alias: 'k',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function Simple({ options }: Props) {
	return (
		<AuthProvider permit_key={options.key} scope={'environment'}>
			<CreateSimpleWizard apiKey={options.key} />
		</AuthProvider>
	);
}

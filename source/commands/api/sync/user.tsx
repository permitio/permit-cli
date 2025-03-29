import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object } from 'zod';
import { option } from 'pastel';
import APISyncUserComponent from '../../../components/api/sync/APISyncUserComponent.js';

export const description =
	'This is a simple command which syncs the user to the Permit.io';
export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	key: string()
		.describe(
			option({
				description:
					'Unique id by which Permit.io identify the user for permission checks.',
				alias: 'userId',
			}),
		)
		.optional(),
	email: string()
		.describe(
			option({
				description: 'Email of the user to sync',
			}),
		)
		.optional(),
	firstName: string()
		.describe(
			option({
				description: 'First name of the user to sync',
			}),
		)
		.optional(),
	lastName: string()
		.describe(
			option({
				description: 'Last name of the user to sync',
			}),
		)
		.optional(),
	attributes: string()
		.describe(
			option({
				description:
					'Attributes of the user to sync. Will accept the JSON string of the attributes.',
			}),
		)
		.optional(),
	roles: string()
		.describe(
			option({
				description:
					'Role assignments to sync for the user. Accepts JSON array string.',
			}),
		)
		.optional(),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function User({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<APISyncUserComponent options={options} />
		</AuthProvider>
	);
}

import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, array, union } from 'zod';
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
	attributes: array(
		string().regex(
			/^\w+:\w+$/,
			'Invalid format. Use attributeKey:attributeValue',
		),
	)
		.describe(
			option({
				description:
					'Attributes of the user to sync. Will accept the comma seperated key value pairs. Eg: key1:value1,key2:value2',
			}),
		)
		.optional(),
	roles: array(
		union([
			string().regex(/^\w+$/, 'Invalid format. Use {{role}}'),
			string().regex(
				/^[-\w]+\/\w+$/,
				'Invalid format. Use {{tenant}}/{{role}}',
			),
			string().regex(
				/^\w+:\w+#\w+$/,
				'Invalid format. Use {{resourceInstance}}#{{role}} (accepts either the resource instance id or key using this format resource_type:resource_instance)',
			),
			string().regex(
				/^[-\w]+\/\w+:\w+#\w+$/,
				'Invalid format. Use {{tenant}}/{{resourceInstance}}#{{role}}',
			),
		]),
	)
		.describe(
			option({
				description:
					'Role assignments to sync for the user. Accepts comma-separated values of the following conventions: `{{role}}` / `{{tenant}}/{{role}}` / `{{tenant}}/{{resourceType}}:{{resourceInstance}}#{{role}}`.',
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

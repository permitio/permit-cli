import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, array } from 'zod';
import { option } from 'pastel';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	userid: string().describe(
		option({
			description:
				'Unique id by which Permit.io identify the user for permission checks.',
		}),
	),
	email: string().describe(
		option({
			description: 'Email of the user to sync',
		}),
	),
	firstName: string().describe(
		option({
			description: 'First name of the user to sync',
		}),
	),
	lastName: string().describe(
		option({
			description: 'Last name of the user to sync',
		}),
	),
	attributes: string().describe(
		option({
			description:
				' Attributes of the user to sync. Will accept the JSON string of the attributes.',
		}),
	),
	roleAssignments: array(
		object({
			role: string().describe(
				option({
					description:
						'Role key to assign, accepts either role id or role key.',
				}),
			),
			tenant: string().describe(
				option({
					description: 'Tenant key or tenant id  for the role assignment.',
				}),
			),
			resourceInstance: string()
				.optional()
				.describe(
					option({
						description:
							'Resource instance id for the role assignment. Accepts in resource_type:resource_id format.',
					}),
				),
		}),
	),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Users({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<></>
		</AuthProvider>
	);
}

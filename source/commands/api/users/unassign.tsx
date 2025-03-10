import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object } from 'zod';
import { option } from 'pastel';
import PermitUsersUnassignComponent from '../../../components/api/PermitUsersUnassignComponent.js';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	projectId: string()
		.optional()
		.describe(
			option({
				description: 'Permit.io Project ID',
			}),
		),
	envId: string()
		.optional()
		.describe(
			option({
				description: 'Permit.io Environment ID',
			}),
		),
	user: string().describe(
		option({
			description: 'User ID to unassign role from',
		}),
	),
	role: string().describe(
		option({
			description: 'Role key to unassign',
		}),
	),
	tenant: string().describe(
		option({
			description: 'Tenant key for the role unassignment',
		}),
	),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Unassign({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PermitUsersUnassignComponent options={{ ...options }} />
		</AuthProvider>
	);
}

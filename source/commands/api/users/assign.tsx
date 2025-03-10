import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object } from 'zod';
import { option } from 'pastel';
import PermitUsersAssignComponent from '../../../components/api/PermitUsersAssignComponent.js';

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
			description: 'User ID to assign role to',
		}),
	),
	role: string().describe(
		option({
			description: 'Role key to assign',
		}),
	),
	tenant: string().describe(
		option({
			description: 'Tenant key for the role assignment',
		}),
	),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Assign({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PermitUsersAssignComponent options={{ ...options }} />
		</AuthProvider>
	);
}

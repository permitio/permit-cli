import React from 'react';
import { AuthProvider } from '../../components/AuthProvider.js';
import PermitUsersComponent from '../../components/permit-api/PermitUsersComponent.js';
import {
	type infer as zInfer,
	string,
	object,
	enum as zEnum,
	boolean,
	number,
} from 'zod';
import { option } from 'pastel';

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
	action: zEnum(['list', 'assign', 'unassign']).describe(
		option({
			description: 'Action to perform on users (list/assign/unassign)',
		}),
	),
	userId: string()
		.optional()
		.describe(
			option({
				description: 'User ID for assign/unassign operations',
			}),
		),
	roleKey: string()
		.optional()
		.describe(
			option({
				description: 'Role key for assign/unassign operations',
			}),
		),
	tenantKey: string()
		.optional()
		.describe(
			option({
				description: 'Tenant key for assign/unassign operations',
			}),
		),
	expandKey: boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description: 'Show full key values instead of truncated',
				alias: 'e',
			}),
		),
	page: number()
		.optional()
		.default(1)
		.describe(
			option({
				description: 'Page number for pagination',
				alias: 'p',
			}),
		),
	perPage: number()
		.optional()
		.default(50)
		.describe(
			option({
				description: 'Number of items per page',
				alias: 'l',
			}),
		),
	role: string()
		.optional()
		.describe(
			option({
				description: 'Filter users by role',
				alias: 'r',
			}),
		),
	all: boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description: 'Fetch all pages of users',
				alias: 'a',
			}),
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Users({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PermitUsersComponent options={options} />
		</AuthProvider>
	);
}

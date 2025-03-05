import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, boolean, number } from 'zod';
import { option } from 'pastel';
import PermitUsersListComponent from '../../../components/api/PermitUsersListComponent.js';

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
	tenantKey: string()
		.optional()
		.describe(
			option({
				description: 'Filter users by tenant',
				alias: 't',
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

export default function List({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PermitUsersListComponent options={{ ...options }} />
		</AuthProvider>
	);
}

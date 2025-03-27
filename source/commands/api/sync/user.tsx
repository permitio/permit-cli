import React, { useMemo } from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object } from 'zod';
import { option } from 'pastel';
import APISyncUserComponent from '../../../components/api/sync/APISyncUserComponent.js';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	userid: string()
		.describe(
			option({
				description:
					'Unique id by which Permit.io identify the user for permission checks.',
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
	roleAssignments: string()
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

// Helper function to parse role assignments from string to array of objects
function parseRoleAssignments(roleAssignmentsStr: string) {
	try {
		const parsed = JSON.parse(roleAssignmentsStr);
		if (!Array.isArray(parsed)) {
			console.error('Role assignments must be a JSON array');
			return [];
		}
		return parsed.map(item => ({
			role: item.role || '',
			tenant: item.tenant,
		}));
	} catch (error) {
		console.error('Failed to parse role assignments JSON:', error);
		return [];
	}
}

export default function User({ options }: Props) {
	// Parse the role assignments if it's a string
	const parsedOptions = useMemo(() => {
		return {
			...options,
			roleAssignments: options.roleAssignments
				? parseRoleAssignments(options.roleAssignments)
				: [],
		};
	}, [options]);

	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<APISyncUserComponent options={parsedOptions} />
		</AuthProvider>
	);
}

import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { option } from 'pastel';
import zod from 'zod';
import CreateSimpleWizard from '../../../components/policy/CreateSimpleWizard.js';

export const description =
	'Create a new Policy table for Role Based Access Control';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit Environment Organization or Project',
				alias: 'k',
			}),
		),
	resources: zod
		.array(zod.string())
		.optional()
		.describe(
			option({
				description:
					'Array of resources in format "key:name@attribute1,attribute2"',
			}),
		),
	actions: zod
		.array(zod.string())
		.optional()
		.describe(
			option({
				description:
					'Array of actions in format "key:description@attribute1,attribute2"',
			}),
		),
	roles: zod
		.array(zod.string())
		.optional()
		.describe(
			option({
				description:
					'Array of roles in format "role:resource:action|resource:action"',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function Simple({ options }: Props) {
	return (
		<AuthProvider permit_key={options.apiKey} scope={'environment'}>
			<CreateSimpleWizard
				presentRoles={options.roles}
				presentResources={options.resources}
				presentActions={options.actions}
			/>
		</AuthProvider>
	);
}

import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import CopyComponent from '../../components/env/CopyComponent.js';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment copying (should be at least a project level key). In case not set, CLI lets you select one',
			}),
		),
	from: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Set the environment ID to copy from. In case not set, the CLI lets you select one.',
			}),
		),
	name: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Set the name of the new environment. In case not set, the CLI will prompt you to enter one.',
			}),
		),
	description: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: The new environment description. In case not set, the CLI will ask you for it.',
			}),
		),
	to: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					"Optional: Copy the environment to an existing environment. In case this variable is set, the 'name' and 'description' variables will be ignored.",
			}),
		),
	conflictStrategy: zod
		.enum(['fail', 'overwrite'])
		.default('fail')
		.optional()
		.describe(
			option({
				description:
					"Optional: Set the environment conflict strategy. In case not set, will use 'fail'.",
			}),
		),
	dataMigration: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: Migrate data (users, roles, etc.) from source to target environment after copying.',
			}),
		),
	skipResources: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: When migrating data, skip resource instances, attributes, and tuples.',
			}),
		),
	skipUsers: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: When migrating data, skip users, role assignments, and user attributes.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Copy({
	options: {
		apiKey,
		from,
		to,
		name,
		description,
		conflictStrategy,
		dataMigration,
		skipResources,
		skipUsers,
	},
}: Props) {
	return (
		<>
			<AuthProvider permit_key={apiKey} scope={'project'}>
				<CopyComponent
					from={from}
					to={to}
					name={name}
					description={description}
					conflictStrategy={conflictStrategy}
					dataMigration={dataMigration}
					skipResources={skipResources}
					skipUsers={skipUsers}
				/>
			</AuthProvider>
		</>
	);
}

import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import DataMigrationComponent from '../../components/env/DataMigrationComponent.js';

export const description =
	'Migrate users and data from one environment to another';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the data migration (should be at least a project level key). If not set, CLI lets you select one',
				alias: 'k',
			}),
		),
	source: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Environment ID to migrate data from. If not set, the CLI lets you select one.',
			}),
		),
	target: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Environment ID to migrate data to. If not set, the CLI lets you select one.',
			}),
		),
	skipResources: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: Skip migration of resource instances, attributes, and tuples.',
			}),
		),
	skipUsers: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: Skip migration of users, role assignments, and user attributes.',
			}),
		),
	conflictStrategy: zod
		.enum(['override', 'fail'])
		.default('override')
		.optional()
		.describe(
			option({
				description:
					"Optional: Strategy to handle migration conflicts. Default is 'override'.",
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function DataMigration({
	options: { key, source, target, skipResources, skipUsers, conflictStrategy },
}: Props) {
	return (
		<AuthProvider permit_key={key} scope={'project'}>
			<DataMigrationComponent
				source={source}
				target={target}
				skipResources={skipResources}
				skipUsers={skipUsers}
				conflictStrategy={conflictStrategy}
			/>
		</AuthProvider>
	);
}

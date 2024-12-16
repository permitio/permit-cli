import React from 'react';
import { option } from 'pastel';

import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import MemberComponent from '../../components/env/MemberComponent.js';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: An API key to perform the invite. A project or organization level API key is required to invite members to the account. In case not set, CLI lets you select one',
			}),
		),
	environment: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Id of the environment you want to add a member to. In case not set, the CLI will prompt you to select one.',
			}),
		),
	project: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: Id of the project you want to add a member.',
			}),
		),
	email: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Email of the user you want to invite. In case not set, the CLI will ask you for it',
			}),
		),
	role: zod
		.enum(['admin', 'write', 'read'])
		.optional()
		.describe(
			option({
				description: 'Optional: Role of the user',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Member({
	options: { key, environment, project, email, role },
}: Props) {
	return (
		<>
			<AuthProvider permit_key={key} scope={'project'}>
				<MemberComponent
					project={project}
					environment={environment}
					email={email}
					role={role}
				/>
			</AuthProvider>
		</>
	);
}

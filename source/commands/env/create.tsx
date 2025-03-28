import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../components/AuthProvider.js';
import CreateComponent from '../../components/env/CreateEnvComponent.js';

export const description = 'Create a new Permit environment';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment creation',
				alias: 'k',
			}),
		),
	name: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment name',
				alias: 'n',
			}),
		),
	envKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment key identifier (slug)',
				alias: 'e',
			}),
		),
	description: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment description',
				alias: 'd',
			}),
		),
	customBranchName: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Custom branch name for GitOps feature',
				alias: 'b',
			}),
		),
	jwks: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'JSON Web Key Set (JWKS) for frontend login, in JSON format',
				alias: 'j',
			}),
		),
	settings: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Environment settings in JSON format',
				alias: 's',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Create({
	options: {
		apiKey,
		name,
		envKey,
		description,
		customBranchName,
		jwks,
		settings,
	},
}: Props) {
	return (
		<AuthProvider permit_key={apiKey} scope={'project'}>
			<CreateComponent
				name={name}
				envKey={envKey}
				description={description}
				customBranchName={customBranchName}
				jwks={jwks}
				settings={settings}
			/>
		</AuthProvider>
	);
}

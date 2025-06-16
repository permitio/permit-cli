import React from 'react';

import { AuthProvider } from '../../../components/AuthProvider.js';
import { GeneratePolicySnapshot } from '../../../components/test/GeneratePolicySnapshot.js';
import zod from 'zod';
import type { infer as zInfer } from 'zod';
import { option } from 'pastel';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: API Key to be used for test generation',
			}),
		),
	dryRun: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Optional: Will generate all the test cases without data creation.',
			}),
		),
	models: zod
		.array(zod.enum(['RBAC', 'ABAC']))
		.optional()
		.default(['RBAC'])
		.describe(
			option({
				description:
					'Optional: an array of all the models the user wants to generate.',
			}),
		),
	path: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Path to the json file to store the generated config (We recommend doing this)',
			}),
		),
	snippet: zod
		.enum(['jest', 'pytest', 'vitest'])
		.optional()
		.describe(
			option({
				description:
					'Test code sample that iterates the config file and asserts the results.',
			}),
		),
	snippetPath: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: Path to save the test file',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function E2e({
	options: { dryRun, models, path, apiKey, snippet, snippetPath },
}: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={apiKey}>
			<GeneratePolicySnapshot
				dryRun={dryRun}
				models={models}
				path={path}
				snippet={snippet}
				snippetPath={snippetPath}
			/>
		</AuthProvider>
	);
}

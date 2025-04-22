import React from 'react';

import { AuthProvider } from '../../../components/AuthProvider.js';
import zod from 'zod';
import type { infer as zInfer } from 'zod';
import { option } from 'pastel';
import { CodeSampleComponent } from '../../../components/test/code-samples/CodeSampleComponent.js';

export const options = zod.object({
	framework: zod.enum(['jest', 'pytest', 'vitest']).describe(
		option({
			description:
				'Test code sample that iterates the config file and asserts the results.',
		}),
	),
	configPath: zod
		.string()
		.optional()
		.default('authz-test.json')
		.describe(
			option({
				description: 'Optional: Path to the generated config json file',
			}),
		),
	path: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: Path to the json file to save the code sample',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: API Key to be used for running tests',
			}),
		),
	pdpUrl: zod
		.string()
		.optional()
		.default('http://localhost:7766')
		.describe(
			option({
				description: 'Optional: PDP to be used in tests.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function E2e({
	options: { framework, configPath, path, apiKey, pdpUrl },
}: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={apiKey} skipLogin={true}>
			<CodeSampleComponent
				framework={framework}
				path={path}
				configPath={configPath}
				pdpUrl={pdpUrl}
			/>
		</AuthProvider>
	);
}

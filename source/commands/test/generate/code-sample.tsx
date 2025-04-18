import React from 'react';

import { AuthProvider } from '../../../components/AuthProvider.js';
import zod from 'zod';
import type { infer as zInfer } from 'zod';
import { option } from 'pastel';
import { CodeSampleComponent } from '../../../components/test/code-samples/CodeSampleComponent.js';

export const options = zod.object({
	codeSample: zod.enum(['jest', 'pytest', 'vitest']).describe(
		option({
			description:
				'Optional: Test code sample that iterates the config file and asserts the results.',
		}),
	),
	configPath: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Path to the json file to store the generated config (We recommend doing this)',
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
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: API Key to be used for test generation',
			}),
		),
	pdpPath: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: API Key to be used for test generation',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function E2e({
	options: { codeSample, configPath, path, apiKey, pdpPath },
}: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={apiKey} skipLogin={true}>
			<CodeSampleComponent
				codeSample={codeSample}
				path={path}
				configPath={configPath}
				pdpPath={pdpPath}
			/>
		</AuthProvider>
	);
}

import React from 'react';

import { AuthProvider } from '../../../components/AuthProvider.js';
import { GeneratePolicySnapshot } from '../../../components/test/GeneratePolicySnapshot.js';
import zod from 'zod';
import type { infer as zInfer } from 'zod';
import { option } from 'pastel';

export const options = zod.object({
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
		.array(zod.string())
		.optional()
		.default(['RBAC', 'ABAC', 'ReBAC'])
		.describe(
			option({
				description:
					'Optional: an array of all the models the user wants to generate.',
			}),
		),
	codeSample: zod
		.enum(['jest', 'pytest'])
		.optional()
		.describe(
			option({
				description:
					'Optional: Test code sample that iterates the config file and asserts the results.',
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
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function E2e({
	options: { dryRun, models, codeSample, path },
}: Props) {
	return (
		<AuthProvider scope={'environment'}>
			<GeneratePolicySnapshot
				dryRun={dryRun}
				models={models}
				codeSample={codeSample}
				path={path}
			/>
		</AuthProvider>
	);
}

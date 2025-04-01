import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import zod from 'zod';
import { option } from 'pastel';

export const description =
	'Clone a single Environment or the entire repository from active GitOps Environment';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit  Project which is used to clone the Environment',
			}),
		),
	dryRun: zod
		.boolean()
		.optional()
		.describe(
			option({
				description:
					'Do not clone the Environment, just show the command which is used to be cloned',
			}),
		)
		.default(false),
	project: zod
		.boolean()
		.optional()
		.describe(
			option({
				description: 'Clone the entire repository',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function Clone({ options }: Props) {
	return (
		<AuthProvider scope={'project'} key={options.apiKey}>
			<></>
		</AuthProvider>
	);
}

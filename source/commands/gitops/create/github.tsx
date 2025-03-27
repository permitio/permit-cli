import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../../components/AuthProvider.js';
import GitHubComponent from '../../../components/gitops/GitHubComponent.js';

export const description =
	'Connect a GitHub repository to a permit Environment';

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
	inactive: zod
		.boolean()
		.optional()
		.describe(
			option({
				description: 'Do not activate the repository When Validated',
				alias: 'i',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function GitHub({ options }: Props) {
	return (
		<AuthProvider permit_key={options.apiKey} scope={'project'}>
			<GitHubComponent inactivateWhenValidated={options.inactive} />
		</AuthProvider>
	);
}

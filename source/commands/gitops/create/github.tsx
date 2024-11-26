import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../../components/AuthProvider.js';
import GitHubComponent from '../../../components/gitops/GitHubComponent.js';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit Environment Organization or Project',
				alias: 'k',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function GitHub({ options }: Props) {
	return (
		<AuthProvider>
			<GitHubComponent authKey={options.key} />
		</AuthProvider>
	);
}

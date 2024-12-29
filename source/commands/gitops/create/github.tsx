import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../../components/AuthProvider.js';
import GitHubComponent from '../../../components/gitops/GitHubComponent.js';
import i18next from 'i18next';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description: i18next.t('github.apiKeyDescription'),
				alias: 'k',
			}),
		),
	inactive: zod
		.boolean()
		.optional()
		.describe(
			option({
				description: i18next.t('github.inactiveDescription'),
				alias: 'i',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function GitHub({ options }: Props) {
	return (
		<AuthProvider>
			<GitHubComponent
				authKey={options.key}
				inactivateWhenValidated={options.inactive}
			/>
		</AuthProvider>
	);
}

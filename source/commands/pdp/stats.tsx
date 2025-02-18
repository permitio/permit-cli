import React from 'react';
import zod, { string } from 'zod';
import { option } from 'pastel';
import PDPStatComponent from '../../components/pdp/PDPStatComponent.js';
import { AuthProvider } from '../../components/AuthProvider.js';

export const options = zod.object({
	projectKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'The project key',
				alias: 'p',
			}),
		),
	environmentKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'The environment key',
				alias: 'e',
			}),
		),
	statsUrl: string()
		.optional()
		.describe(
			option({
				description:
					'The URL of the PDP service. Default to the cloud PDP. (Optional)',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the Permit env, project or Workspace (Optional)',
			}),
		),
});

export type PDPStatsProps = {
	options: zod.infer<typeof options>;
};

export default function Stats({ options }: PDPStatsProps) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PDPStatComponent options={options} />
		</AuthProvider>
	);
}

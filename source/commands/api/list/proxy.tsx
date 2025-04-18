import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, number, boolean } from 'zod';
import { option } from 'pastel';
import APIListProxyComponent from '../../../components/api/proxy/APIListProxyComponent.js';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	expandKey: boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description: 'Show full key values instead of truncated',
				alias: 'e',
			}),
		),
	page: number()
		.optional()
		.default(1)
		.describe(
			option({
				description: 'Page number for pagination',
				alias: 'p',
			}),
		),
	perPage: number()
		.optional()
		.default(30)
		.describe(
			option({
				description: 'Number of items per page',
				alias: 'l',
			}),
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Proxy({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<APIListProxyComponent options={{ ...options }} />
		</AuthProvider>
	);
}

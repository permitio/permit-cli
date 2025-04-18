import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../components/AuthProvider.js';
import PDPCheckUrlComponent from '../../components/pdp/PDPCheckUrlComponent.js';

export const description = 'Check if a user has permission to access a URL';

export const options = zod.object({
	user: zod
		.string()
		.min(1, 'User identifier cannot be empty')
		.describe(
			option({
				description: 'Unique Identity to check for (Required)',
				alias: 'u',
			}),
		),
	url: zod
		.string()
		.min(1, 'URL cannot be empty')
		.describe(
			option({
				description: 'URL to check permissions for (Required)',
			}),
		),
	method: zod
		.string()
		.optional()
		.default('GET')
		.describe(
			option({
				description: 'HTTP method (Optional, defaults to "GET")',
				alias: 'm',
			}),
		),
	tenant: zod
		.string()
		.optional()
		.default('default')
		.describe(
			option({
				description:
					'The tenant the resource belongs to (Optional, defaults to "default")',
				alias: 't',
			}),
		),
	userAttributes: zod
		.array(zod.string())
		.optional()
		.describe(
			option({
				description:
					'User attributes in format key1:value1,key2:value2 (Optional, can be specified multiple times)',
				alias: 'ua',
			}),
		),
	'pdp-url': zod
		.string()
		.optional()
		.default('http://localhost:7766')
		.describe(
			option({
				description:
					'The URL of the PDP service. Defaults to http://localhost:7766. (Optional)',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the Permit env, project or Workspace (Optional)',
				alias: 'k',
			}),
		),
});

export type PDPCheckUrlProps = {
	options: zod.infer<typeof options>;
};

export default function CheckUrl({ options }: PDPCheckUrlProps) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<PDPCheckUrlComponent options={options} />
		</AuthProvider>
	);
}

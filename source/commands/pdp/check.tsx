import React from 'react';
import zod, { string } from 'zod';
import { option } from 'pastel';
import PDPCheckComponent from '../../components/pdp/PDPCheckComponent.js';
import { AuthProvider } from '../../components/AuthProvider.js';

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
	userAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'User attributes in format key1:value1,key2:value2 (Optional)',
				alias: 'ua',
			}),
		),
	resource: zod
		.string()
		.min(1, 'Resource cannot be empty')
		.describe(
			option({
				description: 'Resource being accessed (Required)',
				alias: 'r',
			}),
		),
	resourceAttributes: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Resource attributes in format key1:value1,key2:value2 (Optional)',
				alias: 'ra',
			}),
		),
	action: zod
		.string()
		.min(1, 'Action cannot be empty')
		.describe(
			option({
				description:
					'Action being performed on the resource by the user (Required)',
				alias: 'a',
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
	pdpurl: string()
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

export type PDPCheckProps = {
	options: zod.infer<typeof options>;
};

export default function Check({ options }: PDPCheckProps) {
	return (
		<>
			<AuthProvider scope={'environment'} permit_key={options.apiKey}>
				<PDPCheckComponent options={options} />
			</AuthProvider>
		</>
	);
}

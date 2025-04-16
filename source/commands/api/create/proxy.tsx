import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, array, union, literal } from 'zod';
import { option } from 'pastel';
import CreateProxyConfigComponent from '../../../components/api/proxy/APICreateProxyComponent.js';

export const description = 'Creates a new proxy config inside the Permit.io system.';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	projId: string()
        .optional()
		.describe(
			option({
				description: 'ID or slug of the project',
			}),
		),
	envId: string()
        .optional()
		.describe(
			option({
				description: 'ID or slug of the environment',
			}),
		),
	secret: string()
		.describe(
			option({
				description:
					'Secret used by the Permit Proxy to authenticate with your backend.',
			}),
		)
        .optional(),
	key: string()
		.regex(/^[A-Za-z0-9\-_]+$/, {
			message: 'Invalid key format. Must match /^[A-Za-z0-9-_]+$/',
		})
		.describe(
			option({
				description: 'Unique key identifying the proxy config.',
			}),
		)
        .optional(),
	name: string()
		.describe(
			option({
				description: 'Human-readable name of the proxy config (e.g., Stripe API).',
			}),
		)
        .optional(),
	authMechanism: union([
		literal('Bearer'),
		literal('Basic'),
		literal('Headers'),
	])
		.optional()
		.describe(
			option({
				description:
					'Authentication mechanism used to inject the secret. One of: Bearer, Basic, Headers. Defaults to Bearer.',
			}),
		)
        .optional(),
	// Each string is expected to follow the format:
	// "url|http_method|[resource]|[headers]|[action]|[priority]"
	mapping_rules: array(
		string().regex(
			/^https?:\/\/[^|]+\|(get|put|post|delete|options|head|patch)(\|[^|]+)?(\|[^|]+)?(\|[^|]+)?(\|\d+)?$/i,
			{
				message:
					'Mapping rule must be in the format "url|http_method|[resource]|[headers]|[action]|[priority]".',
			}
		)
	)
		.optional()
		.describe(
			option({
				description:
					'Mapping rules to route requests. Accepts a comma-separated list of values in the format: "url|http_method|[resource]|[headers]|[action]|[priority]".',
				alias: 'mapping_rules',
			})
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Proxy({ options }: Props) {
	return (
		<AuthProvider scope="environment" permit_key={options.apiKey}>
			<CreateProxyConfigComponent options={options} />
		</AuthProvider>
	);
}

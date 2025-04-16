import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { type infer as zInfer, string, object, array, union, literal, record, number } from 'zod';
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
		mapping_rules: array(
			object({
			  url: string().describe(
				option({
				  description:
					'The target URL for the mapping rule (e.g., https://api.stripe.com/v1/customers).',
				}),
			  ),
			  http_method: union([
				literal('get'),
				literal('put'),
				literal('post'),
				literal('delete'),
				literal('options'),
				literal('head'),
				literal('patch'),
			  ]).describe(
				option({
				  description:
					'HTTP method for the mapping rule.',
				}),
			  ),
			  resource: string().describe(
				option({
				  description:
					'The resource that this mapping rule targets.',
				}),
			  ),
			  headers: record(string()).describe(
				option({
				  description:
					'Headers to be sent with the request, mapping header names to values.',
				}),
			  ),
			  action: string()
				.optional()
				.describe(
				  option({
					description:
					  'Optional action to be taken with the rule.',
				  }),
				),
			  priority: number()
				.optional()
				.describe(
				  option({
					description:
					  'Optional priority of the mapping rule (lower number indicates higher priority).',
				  }),
				),
			}),
		  )
			.optional()
			.describe(
			  option({
				description:
				  'List of mapping rules to route requests.',
			  }),
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

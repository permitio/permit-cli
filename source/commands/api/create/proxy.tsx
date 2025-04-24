import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';
import {
	type infer as zInfer,
	string,
	object,
	array,
	union,
	literal,
	number,
} from 'zod';
import { option } from 'pastel';
import CreateProxyConfigComponent from '../../../components/api/proxy/APICreateProxyComponent.js';

export const description = 'Creates a new URL mapping configuration in Permit';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
	secret: string()
		.describe(
			option({
				description:
					'Secret used by the Permit Proxy to authenticate with your HTTP API.',
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
				description:
					'The name of the proxy config, for example(e.g., Stripe API).',
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
	// "method|url|resource|action|priority|{Key:Value,...}|url_type"
	mappingRules: array(
		string().regex(
			/^(get|put|post|delete|options|head|patch)\|https?:\/\/[^|]+?\|[A-Za-z0-9\-_]+(?:\|[^|]+)?(?:\|\d+)?(?:\|\{[^:}]+:[^:}]+(?:,[^:}]+:[^:}]+)*\})?(?:\|(regex|none))?$/i,
			{
				message:
					'Mapping rule must start with a valid HTTP method, then a URL, then a resource (e.g. "get|https://api.example.com|users"), then optionally: "|action|priority|{headers}|url_type".',
			},
		),
	)
		.optional()
		.describe(
			option({
				description:
					'Mapping rules to route requests. Format: "method|url|resource|[action]|[priority]|[{Key:Value,...}]|[url_type]". In case mapping rules argument(s) are provided, all the singe mapping rule arguments will get ignored',
				alias: 'mapping-rules',
			}),
		),

	// New flags for building a single mapping rule
	mappingRuleMethod: string()
		.regex(/^(get|put|post|delete|options|head|patch)$/i, {
			message:
				'Must be a valid HTTP method (get|put|post|delete|options|head|patch).',
		})
		.optional()
		.describe(
			option({
				description: 'HTTP method for a single mapping rule.',
				alias: 'mapping-rule-method',
			}),
		),

	mappingRuleUrl: string()
		.url({ message: 'Must be a valid URL (e.g. https://api.example.com).' })
		.optional()
		.describe(
			option({
				description: 'Target URL for a single mapping rule.',
				alias: 'mapping-rule-url',
			}),
		),

	mappingRuleResource: string()
		.regex(/^[A-Za-z0-9\-_]+$/, {
			message: 'Resource must match /^[A-Za-z0-9\\-_]+$/.',
		})
		.optional()
		.describe(
			option({
				description:
					'Resource to match against the request (no leading slash).',
				alias: 'mapping-rule-resource',
			}),
		),

	mappingRuleAction: string()
		.optional()
		.describe(
			option({
				description: 'Optional action name for the mapping rule.',
				alias: 'mapping-rule-action',
			}),
		),

	mappingRulePriority: number()
		.int()
		.positive()
		.optional()
		.describe(
			option({
				description:
					'Optional priority (positive integer) for the mapping rule.',
				alias: 'mapping-rule-priority',
			}),
		),

	mappingRuleHeaders: array(
		string().regex(/^[^:]+:[^:]+$/, {
			message: 'Each header must be in "Key:Value" format.',
		}),
	)
		.optional()
		.describe(
			option({
				description: 'Optional list of headers, each as "Key:Value".',
				alias: 'mapping-rule-headers',
			}),
		),

	mappingRuleUrlType: union([literal('regex'), literal('none')])
		.optional()
		.describe(
			option({
				description: 'How to interpret the URL: "regex" or "none".',
				alias: 'mapping-rule-url-type',
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

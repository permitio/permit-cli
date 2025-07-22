import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { AuthProvider } from '../../../components/AuthProvider.js';
import TrinoComponent from '../../../components/env/trino/TrinoComponent.js';
import type { TrinoOptions } from '../../../components/env/trino/types.js';

export const description =
	'Apply permissions policy from a Trino schema, creating resources from catalogs, schemas, tables, columns.';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'API key for Permit authentication',
				alias: 'k',
			}),
		),
	url: zod.string().describe(
		option({
			description: 'Trino cluster URL (e.g., http://localhost:8080)',
			alias: 'u',
		}),
	),
	user: zod.string().describe(
		option({
			description: 'Trino username',
		}),
	),
	password: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Trino password or authentication token',
				alias: 'p',
			}),
		),
	catalog: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Restrict to a specific catalog',
				alias: 'c',
			}),
		),
	schema: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Restrict to a specific schema',
				alias: 's',
			}),
		),
});

export default function Trino({ options }: { options: TrinoOptions }) {
	return (
		<AuthProvider permit_key={options.apiKey} scope="environment">
			<TrinoComponent {...options} />
		</AuthProvider>
	);
}

import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../../components/AuthProvider.js';
import OpenapiComponent from '../../../components/env/openapi/OpenapiComponent.js';

export const description =
	'Apply permissions policy from an OpenAPI spec using the `-x-permit` extensions.';

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
	specFile: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Path to the OpenAPI file to read from. It could be a local path or an HTTP endpoint.',
				alias: 'f',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Openapi({ options: { apiKey, specFile } }: Props) {
	return (
		<AuthProvider permit_key={apiKey} scope={'environment'}>
			<OpenapiComponent specFile={specFile} />
		</AuthProvider>
	);
}

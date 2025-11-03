import React from 'react';
import { AuthProvider } from '../../components/AuthProvider.js';
import PDPRunComponent from '../../components/pdp/PDPRunComponent.js';
import { type infer as zInfer, number, object, boolean, string } from 'zod';
import { option } from 'pastel';

export const description =
	'Run a Permit PDP Docker container for local development';

export const options = object({
	opa: number()
		.optional()
		.describe(option({ description: 'Expose OPA port from the PDP' })),
	dryRun: boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description: 'Print the Docker command without executing it',
				alias: 'd',
			}),
		),
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'The API key for the Permit env, project or Workspace',
				alias: 'k',
			}),
		),
	tag: string()
		.default('latest')
		.describe(
			option({
				description: 'The tag of the PDP image to use',
				alias: 't',
			}),
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Run({ options: { opa, dryRun, apiKey, tag } }: Props) {
	return (
		<AuthProvider permit_key={apiKey} scope={'environment'}>
			<PDPRunComponent opa={opa} dryRun={dryRun} tag={tag} />
		</AuthProvider>
	);
}

import React from 'react';
import { AuthProvider } from '../components/AuthProvider.js';
import Graph from '../components/graphCommand.js';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'The API key for the Permit env, project or Workspace',
			}),
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function graph({ options }: Props) {
	return (
		<AuthProvider permit_key={options.apiKey} scope="environment">
			<Graph options={options} />
		</AuthProvider>
	);
}

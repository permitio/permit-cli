import React from 'react';
import zod from 'zod';
import { option } from 'pastel';
import { AuthProvider } from '../../components/AuthProvider.js';
import OPAPolicyComponent from '../../components/opa/OPAPolicyComponent.js';

export const options = zod.object({
	serverUrl: zod
		.string()
		.default('http://localhost:8181')
		.describe(
			option({
				description: 'The OPA server URL',
				alias: 's',
			}),
		),
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the OPA Server and Permit env, project or Workspace',
			}),
		),
});

export type OpaPolicyProps = {
	options: zod.infer<typeof options>;
};

export default function Policy({ options }: OpaPolicyProps) {
	return (
		<>
			<AuthProvider>
				<OPAPolicyComponent options={options} />
			</AuthProvider>
		</>
	);
}

import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { AuthProvider } from '../../../components/AuthProvider.js';
import ApplyComponent from '../../../components/env/template/ApplyComponent.js';
export const description = 'A apply command to run the TF file';
export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environemnt to apply the terraform template.',
			}),
		),
	local: zod
		.boolean()
		.optional()
		.describe(
			option({
				description:
					'To run the Terraform command locally instead of the server (will fail if Terraform is not installed.',
			}),
		),
	template: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Skips the template choice and and apply the given template. It will fail if the template does not exist.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Template({ options: { key, local, template } }: Props) {
	return (
		<>
			<AuthProvider permit_key={key} scope={'environment'}>
				<ApplyComponent
					apiKey={key}
					local={local}
					template={template}
				></ApplyComponent>
			</AuthProvider>
		</>
	);
}

import React from 'react';
import { AuthProvider } from '../../../components/AuthProvider.js';

import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { TFChatComponent } from '../../../components/policy/create/TFChatComponent.js';

export const options = object({
	apiKey: string()
		.optional()
		.describe(
			option({
				description: 'Your Permit.io API key',
			}),
		),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function AI({ options }: Props) {
	return (
		<AuthProvider scope={'environment'} permit_key={options.apiKey}>
			<TFChatComponent />
		</AuthProvider>
	);
}

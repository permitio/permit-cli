import React from 'react';
import { AuthProvider } from '../../components/AuthProvider.js';
import PDPCommand from '../../components/PDPCommand.js';
import { type infer as zInfer, number, object } from 'zod';
import { option } from 'pastel';
import i18next from 'i18next';

export const options = object({
	opa: number()
		.optional()
		.describe(option({ description: i18next.t('run.opaDescription') })),
});

type Props = {
	options: zInfer<typeof options>;
};

export default function Run({ options: { opa } }: Props) {
	return (
		<AuthProvider>
			<PDPCommand opa={opa} />
		</AuthProvider>
	);
}

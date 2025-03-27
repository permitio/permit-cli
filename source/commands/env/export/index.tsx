import React from 'react';
import { option } from 'pastel';
import zod from 'zod';
import { AuthProvider } from '../../../components/AuthProvider.js';
import { ExportContent } from '../../../components/export/ExportContent.js';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'API Key to be used for the environment export',
				alias: 'k',
			}),
		),
	file: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'File path to save the exported HCL content',
				alias: 'f',
			}),
		),
	includeDefaultRoles: zod
		.boolean()
		.optional()
		.default(false)
		.describe(
			option({
				description:
					'Include default roles (admin, editor, viewer) in the export',
				alias: 'i',
			}),
		),
});

type Props = {
	readonly options: zod.infer<typeof options>;
};

export default function Export(props: Props) {
	return (
		<AuthProvider>
			<ExportContent {...props} />
		</AuthProvider>
	);
}

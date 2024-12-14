import zod from 'zod';
import { option } from 'pastel';
import { DEFAULT_PERMIT_KEYSTORE_ACCOUNT } from '../config.js';
import i18next from 'i18next';

export const keyAccountOption = zod
	.string()
	.optional()
	.default(DEFAULT_PERMIT_KEYSTORE_ACCOUNT)
	.describe(
		option({
			description: i18next.t('keyAccountDescription'),
			alias: 'k',
		}),
	);

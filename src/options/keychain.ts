import zod from 'zod';
import { option } from 'pastel';
import { DEFAULT_PERMIT_KEYSTORE_ACCOUNT } from '../config/config';

export const keyAccountOption = zod
	.string()
	.optional()
	.default(DEFAULT_PERMIT_KEYSTORE_ACCOUNT)
	.describe(
		option({
			description:
				'A string (e.g. the Permit Environment or Project key) to act as the account this would be saved under in the machine secure key-chain',
			alias: 'k',
		}),
	);

import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/pdp-v1.js';
import useClient from './useClient.js';

export type AuthorizationQuery = components['schemas']['AuthorizationQuery'];

export interface UrlRequestInput {
	user: {
		key: string;
		firstName?: string;
		lastName?: string;
		email?: string;
		attributes: Record<string, string | number | boolean>;
	};
	http_method: string;
	url: string;
	tenant: string;
	context: Record<string, unknown>;
	sdk?: string;
}

export const useCheckPdpApi = () => {
	const { authenticatedPdpClient } = useClient();

	const getAllowedCheck = useCallback(
		async (body: AuthorizationQuery, pdp_url?: string) => {
			return await authenticatedPdpClient(pdp_url).POST(
				'/allowed',
				undefined,
				body,
			);
		},
		[authenticatedPdpClient],
	);

	const getAllowedUrlCheck = useCallback(
		async (requestInput: UrlRequestInput, pdp_url?: string) => {
			const apiBody = { ...requestInput };

			type ApiCompliantBody = {
				user: {
					key: string;
					firstName?: string;
					lastName?: string;
					email?: string;
					attributes: Record<string, never>;
				};
				http_method: string;
				url: string;
				tenant: string;
				context: Record<string, never>;
				sdk?: string;
			};

			return await authenticatedPdpClient(pdp_url).POST(
				'/allowed_url',
				undefined,
				apiBody as unknown as ApiCompliantBody,
			);
		},
		[authenticatedPdpClient],
	);

	return useMemo(
		() => ({
			getAllowedCheck,
			getAllowedUrlCheck,
		}),
		[getAllowedCheck, getAllowedUrlCheck],
	);
};

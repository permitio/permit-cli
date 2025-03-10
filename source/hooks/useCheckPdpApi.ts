import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/pdp-v1.js';
import useClient from './useClient.js';

export type AuthorizationQuery = components['schemas']['AuthorizationQuery'];

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

	return useMemo(
		() => ({
			getAllowedCheck,
		}),
		[getAllowedCheck],
	);
};

import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

export const useProjectAPI = () => {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const getProjects = useCallback(
		async (accessToken?: string, cookie?: string | null) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						'/v2/projects',
					)
				: await authenticatedApiClient().GET('/v2/projects');
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	return useMemo(
		() => ({
			getProjects,
		}),
		[getProjects],
	);
};

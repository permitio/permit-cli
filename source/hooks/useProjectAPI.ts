import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

export const useProjectAPI = () => {
	const { authenticatedApiClient } = useClient();
	const getProjects = useCallback(async () => {
		return await authenticatedApiClient().GET('/v2/projects');
	}, [authenticatedApiClient]);

	return useMemo(
		() => ({
			getProjects,
		}),
		[getProjects],
	);
};

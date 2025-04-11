import useClient from './useClient.js';
import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';

export type ResourceRead = components['schemas']['ResourceRead'];

export const useResourcesApi = () => {
	const { authenticatedApiClient } = useClient();

	const getResources = useCallback(async () => {
		return await authenticatedApiClient().GET(
			`/v2/schema/{proj_id}/{env_id}/resources`,
		);
	}, [authenticatedApiClient]);

	return useMemo(
		() => ({
			getResources,
		}),
		[getResources],
	);
};

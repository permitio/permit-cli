import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

// type Project = {
// 	key: string;
// 	urn_namespace?: string;
// 	id: string;
// 	organization_id: string;
// 	created_at: string;
// 	updated_at: string;
// 	name: string;
// 	description?: string;
// 	settings: Record<string, unknown>;
// 	active_policy_repo_id: string;
// };

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

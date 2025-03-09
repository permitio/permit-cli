import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';
// import { authenticatedApiClient } from '../lib/api.js';

export type EnvironmentCopy = components['schemas']['EnvironmentCopy'];

export const useEnvironmentApi = () => {
	const { authenticatedApiClient } = useClient();

	const getEnvironments = useCallback(
		async (project_id: string) => {
			return await authenticatedApiClient().GET(`/v2/projects/{proj_id}/envs`, {
				proj_id: project_id,
			});
		},
		[authenticatedApiClient],
	);

	const getEnvironment = useCallback(
		async (project_id: string, environment_id: string) => {
			return await authenticatedApiClient().GET(
				`/v2/projects/{proj_id}/envs/{env_id}`,
				{ proj_id: project_id, env_id: environment_id },
			);
		},
		[authenticatedApiClient],
	);

	const copyEnvironment = useCallback(
		async (proj_id: string, env_id: string, body: EnvironmentCopy) => {
			return await authenticatedApiClient().POST(
				`/v2/projects/{proj_id}/envs/{env_id}/copy`,
				{ xyz: proj_id, env_id },
				body,
				undefined,
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getEnvironments,
			getEnvironment,
			copyEnvironment,
		}),
		[copyEnvironment, getEnvironment, getEnvironments],
	);
};

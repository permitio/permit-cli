import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';

export type EnvironmentCopy = components['schemas']['EnvironmentCopy'];

export const useEnvironmentApi = () => {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	const getEnvironments = useCallback(
		async (
			project_id: string,
			accessToken?: string,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						`/v2/projects/{proj_id}/envs`,
						{
							proj_id: project_id,
						},
					)
				: await authenticatedApiClient().GET(`/v2/projects/{proj_id}/envs`, {
						proj_id: project_id,
					});
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const getEnvironment = useCallback(
		async (
			project_id: string,
			environment_id: string,
			accessToken?: string | null,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						`/v2/projects/{proj_id}/envs/{env_id}`,
						{
							proj_id: project_id,
							env_id: environment_id,
						},
					)
				: await authenticatedApiClient().GET(
						`/v2/projects/{proj_id}/envs/{env_id}`,
						{ proj_id: project_id, env_id: environment_id },
					);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
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

import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';

export type EnvironmentCopy = components['schemas']['EnvironmentCopy'];
export type Environment = components['schemas']['EnvironmentRead'];

type CreateEnvironmentParams = {
	name: string;
	key: string;
	description?: string;
	settings?: Record<string, never>;
};

export const useEnvironmentApi = () => {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	// Keep original method signatures to maintain compatibility
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
				{ proj_id, env_id },
				body,
				undefined,
			);
		},
		[authenticatedApiClient],
	);

	// New methods for create and delete operations
	const createEnvironment = useCallback(
		async (
			projectId: string,
			accessToken?: string,
			cookie?: string | null,
			params?: CreateEnvironmentParams,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).POST(
						`/v2/projects/{proj_id}/envs`,
						{ proj_id: projectId },
						params,
					)
				: await authenticatedApiClient().POST(
						`/v2/projects/{proj_id}/envs`,
						{ proj_id: projectId },
						params,
					);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const deleteEnvironment = useCallback(
		async (
			projectId: string,
			environmentId: string,
			accessToken?: string,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).DELETE(
						`/v2/projects/{proj_id}/envs/{env_id}`,
						{ proj_id: projectId, env_id: environmentId },
						undefined,
						undefined,
					)
				: await authenticatedApiClient().DELETE(
						`/v2/projects/{proj_id}/envs/{env_id}`,
						{ proj_id: projectId, env_id: environmentId },
						undefined,
						undefined,
					);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	return useMemo(
		() => ({
			getEnvironments,
			getEnvironment,
			copyEnvironment,
			createEnvironment,
			deleteEnvironment,
		}),
		[
			getEnvironments,
			getEnvironment,
			copyEnvironment,
			createEnvironment,
			deleteEnvironment,
		],
	);
};

import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';

export type EnvironmentCopy = components['schemas']['EnvironmentCopy'];

// Define type for environment creation parameters to match API expectations
export type CreateEnvironmentParams = {
	key: string;
	name: string;
	description?: string;
	custom_branch_name?: string;
	jwks?: {
		ttl: number;
		url?: string;
		jwks?: {
			keys: Record<string, unknown>[];
		};
	};
	settings?: Record<string, unknown>;
};

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
				{ proj_id, env_id },
				body,
				undefined,
			);
		},
		[authenticatedApiClient],
	);

	// Add back the createEnvironment function with proper type
	const createEnvironment = useCallback(
		async (
			projectId: string,
			accessToken?: string,
			cookie?: string | null,
			params?: CreateEnvironmentParams,
		) => {
			// Using a safer type assertion approach
			const apiParams =
				params as unknown as components['schemas']['EnvironmentCreate'];
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).POST(
						`/v2/projects/{proj_id}/envs`,
						{ proj_id: projectId },
						apiParams,
					)
				: await authenticatedApiClient().POST(
						`/v2/projects/{proj_id}/envs`,
						{ proj_id: projectId },
						apiParams,
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
			try {
				const result =
					accessToken || cookie
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
				return result;
			} catch (err) {
				// a 204 No Content response after a successful deletion
				if (
					err instanceof Error &&
					err.message.includes('Unexpected end of JSON input')
				) {
					// Return a successful response object that matches the expected structure
					return {
						data: null,
						response: { status: 204 },
						error: null,
					};
				}
				// Re-throw any other errors to be handled by the component
				throw err;
			}
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

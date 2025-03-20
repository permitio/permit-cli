import { useCallback, useMemo } from 'react';
import { TokenType, tokenType } from '../lib/auth.js';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';

export interface ApiKeyScope {
	organization_id: string;
	project_id?: string;
	environment_id?: string;
}

export type MemberAccessObj = 'org' | 'project' | 'env';

export type ApiKeyCreate = components['schemas']['APIKeyCreate'];

export const useApiKeyApi = () => {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	const getProjectEnvironmentApiKey = useCallback(
		async (environmentId: string, projectId?: string, cookie?: string) => {
			return cookie
				? await unAuthenticatedApiClient(undefined, cookie).GET(
						`/v2/api-key/{proj_id}/{env_id}`,
						{ proj_id: projectId ?? '', env_id: environmentId },
					)
				: await authenticatedApiClient().GET(`/v2/api-key/{proj_id}/{env_id}`, {
						env_id: environmentId,
					});
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const getApiKeyScope = useCallback(
		async (accessToken?: string) => {
			return accessToken
				? await unAuthenticatedApiClient(accessToken, undefined).GET(
						`/v2/api-key/scope`,
					)
				: await authenticatedApiClient().GET(`/v2/api-key/scope`);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const getApiKeyList = useCallback(
		async (
			objectType: MemberAccessObj,
			projectId?: string | null,
			accessToken?: string,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						`/v2/api-key`,
						undefined,
						undefined,
						{
							object_type: objectType,
							proj_id: projectId === null ? undefined : projectId,
						},
					)
				: await authenticatedApiClient().GET(
						`/v2/api-key`,
						undefined,
						undefined,
						{
							object_type: objectType,
							proj_id: projectId === null ? undefined : projectId,
						},
					);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const getApiKeyById = useCallback(
		async (apiKeyId: string, accessToken?: string, cookie?: string | null) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						`/v2/api-key/{api_key_id}`,
						{ api_key_id: apiKeyId },
					)
				: await authenticatedApiClient().GET(`/v2/api-key/{api_key_id}`, {
						api_key_id: apiKeyId,
					});
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const validateApiKey = useCallback((apiKey: string) => {
		return apiKey && tokenType(apiKey) === TokenType.APIToken;
	}, []);

	const validateApiKeyScope = useCallback(
		async (
			apiKey: string,
			keyLevel: 'organization' | 'project' | 'environment',
		) => {
			let error = null;
			let valid = false;

			if (!validateApiKey(apiKey)) {
				return {
					valid: false,
					scope: null,
					error: 'Please provide a valid api key',
				};
			}
			const { data: scope, error: err } = await getApiKeyScope(apiKey);

			if (err) {
				error = err;
			}
			if (keyLevel === 'organization' && scope) {
				if (scope.environment_id || scope.project_id) {
					valid = false;
					error = 'Please provide an organization level API key';
				} else if (scope.organization_id) {
					valid = true;
				}
			} else if (keyLevel === 'project' && scope) {
				if (scope.environment_id) {
					valid = false;
					error = 'Please provide a project level API key or above.';
				} else if (scope.project_id || scope.organization_id) {
					valid = true;
				}
			} else if (keyLevel === 'environment' && scope) {
				if (scope.environment_id || scope.project_id || scope.organization_id) {
					valid = true;
				} else {
					error = 'Please provide a project level API key';
				}
			}
			return { valid, scope, error };
		},
		[getApiKeyScope, validateApiKey],
	);

	const createApiKey = useCallback(
		async (
			body: ApiKeyCreate,
			accessToken?: string | null,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).POST(
						'/v2/api-key',
						undefined,
						body,
					)
				: await authenticatedApiClient().POST('/v2/api-key', undefined, body);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	return useMemo(
		() => ({
			getProjectEnvironmentApiKey,
			getApiKeyScope,
			getApiKeyList,
			getApiKeyById,
			createApiKey,
			validateApiKeyScope,
			validateApiKey,
		}),
		[
			createApiKey,
			getApiKeyById,
			getApiKeyList,
			getApiKeyScope,
			getProjectEnvironmentApiKey,
			validateApiKey,
			validateApiKeyScope,
		],
	);
};

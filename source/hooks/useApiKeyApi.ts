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
	const { authenticatedApiClient } = useClient();

	const getProjectEnvironmentApiKey = useCallback(
		async (environmentId: string) => {
			return await authenticatedApiClient().GET(
				`/v2/api-key/{proj_id}/{env_id}`,
				{ env_id: environmentId },
			);
		},
		[authenticatedApiClient],
	);

	const getApiKeyScope = useCallback(async () => {
		return await authenticatedApiClient().GET(`/v2/api-key/scope`);
	}, [authenticatedApiClient]);

	const getApiKeyList = useCallback(
		async (objectType: MemberAccessObj, projectId?: string | null) => {
			return await authenticatedApiClient().GET(
				`/v2/api-key`,
				undefined,
				undefined,
				{
					object_type: objectType,
					proj_id: projectId === null ? undefined : projectId,
				},
			);
		},
		[authenticatedApiClient],
	);

	const getApiKeyById = useCallback(
		async (apiKeyId: string) => {
			return await authenticatedApiClient().GET(`/v2/api-key/{api_key_id}`, {
				api_key_id: apiKeyId,
			});
		},
		[authenticatedApiClient],
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
			const { data: scope, error: err } = await getApiKeyScope();

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
		async (body: ApiKeyCreate) => {
			return await authenticatedApiClient().POST(
				'/v2/api-key',
				undefined,
				body,
			);
		},
		[authenticatedApiClient],
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

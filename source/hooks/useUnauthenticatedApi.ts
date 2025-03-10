import { useCallback, useMemo } from 'react';
import { TokenType, tokenType } from '../lib/auth.js';
import { ApiKeyCreate, MemberAccessObj } from './useApiKeyApi.js';
import { OrganizationCreate } from './useOrganisationApi.js';
import useClient from './useClient.js';

export const useUnauthenticatedApi = () => {
	const { unAuthenticatedApiClient } = useClient();

	const getProjectEnvironmentApiKey = useCallback(
		async (projectId: string, environmentId: string, cookie: string) => {
			return await unAuthenticatedApiClient(undefined, cookie).GET(
				`/v2/api-key/{proj_id}/{env_id}`,
				{ proj_id: projectId, env_id: environmentId },
			);
		},
		[unAuthenticatedApiClient],
	);

	const getApiKeyScope = useCallback(
		async (accessToken: string) => {
			return await unAuthenticatedApiClient(accessToken, undefined).GET(
				`/v2/api-key/scope`,
			);
		},
		[unAuthenticatedApiClient],
	);

	const getApiKeyList = useCallback(
		async (
			objectType: MemberAccessObj,
			accessToken?: string,
			cookie?: string | null,
			projectId?: string | null,
		) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				`/v2/api-key`,
				undefined,
				undefined,
				{
					object_type: objectType,
					proj_id: projectId === null ? undefined : projectId,
				},
			);
		},
		[unAuthenticatedApiClient],
	);

	const getApiKeyById = useCallback(
		async (apiKeyId: string, accessToken: string, cookie?: string | null) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				`/v2/api-key/{api_key_id}`,
				{ api_key_id: apiKeyId },
			);
		},
		[unAuthenticatedApiClient],
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
		async (token: string, body: ApiKeyCreate, cookie?: string | null) => {
			return await unAuthenticatedApiClient(token, cookie).POST(
				'/v2/api-key',
				undefined,
				body,
			);
		},
		[unAuthenticatedApiClient],
	);

	const getOrgs = useCallback(
		async (accessToken: string, cookie: string) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				'/v2/orgs',
			);
		},
		[unAuthenticatedApiClient],
	);

	const getOrg = useCallback(
		async (
			organizationId: string,
			accessToken: string,
			cookie?: string | null,
		) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				`/v2/orgs/{org_id}`,
				{
					org_id: organizationId,
				},
			);
		},
		[unAuthenticatedApiClient],
	);

	const getProjects = useCallback(
		async (accessToken: string, cookie?: string | null) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				'/v2/projects',
			);
		},
		[unAuthenticatedApiClient],
	);

	const getEnvironment = useCallback(
		async (
			projectId: string,
			environmentId: string,
			accessToken: string,
			cookie?: string | null,
		) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				`/v2/projects/{proj_id}/envs/{env_id}`,
				{
					proj_id: projectId,
					env_id: environmentId,
				},
			);
		},
		[unAuthenticatedApiClient],
	);

	const getEnvironments = useCallback(
		async (projectId: string, accessToken: string, cookie?: string | null) => {
			return await unAuthenticatedApiClient(accessToken, cookie).GET(
				`/v2/projects/{proj_id}/envs`,
				{
					proj_id: projectId,
				},
			);
		},
		[unAuthenticatedApiClient],
	);

	const createOrg = useCallback(
		async (
			body: OrganizationCreate,
			accessToken: string,
			cookie?: string | null,
		) => {
			return await unAuthenticatedApiClient(accessToken, cookie).POST(
				`/v2/orgs`,
				undefined,
				body,
			);
		},
		[unAuthenticatedApiClient],
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
			getOrgs,
			getOrg,
			createOrg,
			getProjects,
			getEnvironment,
			getEnvironments,
		}),
		[
			createApiKey,
			createOrg,
			getApiKeyById,
			getApiKeyList,
			getApiKeyScope,
			getEnvironment,
			getEnvironments,
			getOrg,
			getOrgs,
			getProjectEnvironmentApiKey,
			getProjects,
			validateApiKey,
			validateApiKeyScope,
		],
	);
};

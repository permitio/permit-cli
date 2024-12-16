import { useCallback, useMemo } from 'react';
import { apiCall } from '../lib/api.js';
import { TokenType, tokenType } from '../lib/auth.js';

export interface ApiKeyScope {
	organization_id: string;
	project_id: string | null;
	environment_id: string | null;
}

type MemberAccessObj = 'org' | 'project' | 'env';
type MemberAccessLevel = 'admin' | 'write' | 'read' | 'no_access';
type APIKeyOwnerType = 'pdp_config' | 'member' | 'elements';

interface ApiKeyResponse {
	organization_id: string; // UUID
	project_id?: string; // UUID (optional)
	environment_id?: string; // UUID (optional)
	object_type?: MemberAccessObj; // Default: "env"
	access_level?: MemberAccessLevel; // Default: "admin"
	owner_type: APIKeyOwnerType;
	name?: string;
	id: string; // UUID
	secret?: string;
	created_at: string;
	last_used_at?: string; // date-time
}

interface PaginatedApiKeyResponse {
	data: ApiKeyResponse[];
	total_count: number; // >= 0
	page_count?: number; // Default: 0
}

export const useApiKeyApi = () => {
	const getProjectEnvironmentApiKey = async (
		projectId: string,
		environmentId: string,
		cookie: string,
		accessToken: string | null,
	) => {
		return await apiCall(
			`v2/api-key/${projectId}/${environmentId}`,
			accessToken ?? '',
			cookie,
		);
	};

	const getApiKeyScope = async (accessToken: string) => {
		return await apiCall<ApiKeyScope>(`v2/api-key/scope`, accessToken);
	};

	const getApiKeyList = async (
		objectType: MemberAccessObj,
		accessToken: string,
		cookie?: string | null,
		projectId?: string | null,
	) => {
		return await apiCall<PaginatedApiKeyResponse>(
			`v2/api-key?object_type=${objectType}${projectId ? '&proj_id=' + projectId : ''}`,
			accessToken,
			cookie ?? '',
		);
	};

	const getApiKeyById = async (
		apiKeyId: string,
		accessToken: string,
		cookie?: string | null,
	) => {
		return await apiCall<ApiKeyResponse>(
			`v2/api-key/${apiKeyId}`,
			accessToken,
			cookie ?? '',
		);
	};

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
			const { response: scope, error: err } = await getApiKeyScope(apiKey);

			if (err) {
				error = err;
			}
			if (keyLevel === 'organization') {
				if (scope.environment_id || scope.project_id) {
					valid = false;
					error = 'Please provide an organization level API key';
				} else if (scope.organization_id) {
					valid = true;
				}
			} else if (keyLevel === 'project') {
				if (scope.environment_id) {
					valid = false;
					error = 'Please provide a project level API key or above.';
				} else if (scope.project_id || scope.organization_id) {
					valid = true;
				}
			} else if (keyLevel === 'environment') {
				if (scope.environment_id || scope.project_id || scope.organization_id) {
					valid = true;
				} else {
					error = 'Please provide a project level API key';
				}
			}
			return { valid, scope, error };
		},
		[validateApiKey],
	);

	return useMemo(
		() => ({
			getProjectEnvironmentApiKey,
			getApiKeyScope,
			getApiKeyList,
			getApiKeyById,
			validateApiKeyScope,
			validateApiKey,
		}),
		[validateApiKey, validateApiKeyScope],
	);
};

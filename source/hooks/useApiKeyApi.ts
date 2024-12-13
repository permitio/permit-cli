import { useCallback, useMemo } from 'react';
import { apiCall } from '../lib/api.js';
import { TokenType, tokenType } from '../lib/auth.js';

export interface ApiKeyScope {
	organization_id: string;
	project_id: string | null;
	environment_id: string | null;
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
			validateApiKeyScope,
			validateApiKey,
		}),
		[validateApiKey, validateApiKeyScope],
	);
};

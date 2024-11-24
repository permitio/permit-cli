import { apiCall } from '../lib/api.js';

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

	return {
		getProjectEnvironmentApiKey,
		getApiKeyScope,
	};
};

import { apiCall } from '../lib/api.js';

export const useApiKeyApi = () => {

	const getProjectEnvironmentApiKey = async (projectId: string, environmentId: string, cookie: string, accessToken: string | null) => {
		return await apiCall(
			`v2/api-key/${projectId}/${environmentId}`,
			accessToken ?? '',
			cookie,
		);
	};

	return {
		getProjectEnvironmentApiKey,
	};

};

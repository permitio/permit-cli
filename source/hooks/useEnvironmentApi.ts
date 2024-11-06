import { apiCall } from '../lib/api.js';

type Environment = {
	key: string;
	id: string;
	organization_id: string;
	project_id: string;
	created_at: string;
	updated_at: string;
	avp_policy_store_id?: string;
	name: string;
	description?: string;
	custom_branch_name?: string;
	jwks?: Record<string, unknown>;
	settings?: Record<string, unknown>;
	email_configuration: string;
};

export const useEnvironmentApi = () => {

	const getEnvironments = async (projectId: string, accessToken: string, cookie: string) => {
		return await apiCall<Environment[]>(`v2/projects/${projectId}/envs`, accessToken, cookie);
	}

	return {
		getEnvironments,
	}

}

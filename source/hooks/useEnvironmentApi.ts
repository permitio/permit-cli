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
	const getEnvironments = async (
		projectId: string,
		accessToken: string,
		cookie: string | null,
	) => {
		return await apiCall<Environment[]>(
			`v2/projects/${projectId}/envs`,
			accessToken,
			cookie ?? '',
		);
	};

	const getEnvironment = async (
		projectId: string,
		environmentId: string,
		accessToken: string,
		cookie: string | null,
	) => {
		return await apiCall<Environment>(
			`v2/projects/${projectId}/envs/${environmentId}`,
			accessToken,
			cookie ?? '',
		);
	};

	const copyEnvironment = async (
		projectId: string,
		environmentId: string,
		accessToken: string,
		cookie: string | null,
		body: any,
	) => {
		return await apiCall(
			`v2/projects/${projectId}/envs/${environmentId}/copy`,
			accessToken,
			cookie ?? '',
			'POST',
			body,
		);
	};

	return {
		getEnvironments,
		getEnvironment,
		copyEnvironment,
	};
};

import { apiCall } from '../lib/api.js';

type Project = {
	key: string;
	urn_namespace?: string;
	id: string;
	organization_id: string;
	created_at: string;
	updated_at: string;
	name: string;
	description?: string;
	settings: Record<string, unknown>;
	active_policy_repo_id: string;
};


export const useProjectAPI = () => {

	const getProjects = async (accessToken: string, cookie: string) => {
		return await apiCall<Project>('v2/projects', accessToken, cookie)
	}

	return {
		getProjects,
	}

}

import { APIError } from '../errors/errors.js';
import { apiCall } from '../utils/apiCall.js';

export type Project = {
	key: string;
	urn_namespace: string;
	id: string;
	organization_id: string;
	created_at: string;
	updated_at: string;
	name: string;
	description: string;
	settings: Record<string, any>;
	active_policy_repo_id: string;
};

export const getProjects = async (
	accessToken: string,
	cookie: string,
): Promise<Project[] | APIError> => {
	const result = await apiCall('v2/projects', accessToken, cookie);
	if (result instanceof APIError) {
		return result;
	}

	return result.response as Project[];
};

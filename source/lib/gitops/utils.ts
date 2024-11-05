import { apiCall } from '../api.js';
import { PERMIT_API_URL } from '../../config.js';

type Project = {
	key: string;
	urn_namespace: string;
	id: string;
	organization_id: string;
	created_at: string;
	updated_at: string;
	name: string;
};
type GitConfig = {
	url: string;
	main_branch_name: string;
	credentials: {
		auth_type: string;
		username: string;
		private_key: string;
	};
	key: string;
};
type GitConfigResponse = {
	url: string;
	main_branch_name: string;
	credentials: {
		auth_type: string;
		username: string;
		private_key: string;
	};
	key: string;
	id: string;
	status: 'invalid' | 'pending' | 'valid';
};
async function getProjectsList(apiKey: string): Promise<Project[]> {
	const projects: Project[] = [];

	const response = await apiCall('v2/projects', apiKey);
	if (response.status === 422) {
		throw new Error('Validation Error');
	}
	if (response.status === 401) {
		throw new Error('Unauthorized');
	}
	if (response.status === 200) {
		for (let i = 0; i < response.response.length; i += 1) {
			projects.push(response.response[i]);
		}
	}

	return projects;
}

async function configurePermitPolicy(
	apiKey: string,
	projectKey: string,
	gitConfig: GitConfig,
) {
	const endpoint = `v2/projects/${projectKey}/repos`;
	const body = gitConfig;
	const options: RequestInit = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(body),
	};
	const resp = await fetch(`${PERMIT_API_URL}/${endpoint}`, options);
	const response = await resp.json();

	if (resp.status === 422) {
		console.log(resp);
		throw new Error('Validation Error');
	}
	if (resp.status === 401) {
		throw new Error('Unauthorized');
	}
	const gitConfigResponse = response as GitConfigResponse;
	return {
		id: gitConfigResponse.id,
		key: gitConfigResponse.key,
		status: gitConfigResponse.status,
	};
}

async function activatePermitPolicy(
	apiKey: string,
	projectId: string,
	repoId: string,
) {
	const endpoint = `v2/projects/${projectId}/repos/${repoId}/activate`;
	const response = await apiCall(endpoint, apiKey, 'PUT');
	if (response.status === 422) {
		throw new Error('Validation Error');
	}
	if (response.status === 200) {
		return true;
	} else {
		return false;
	}
}

export { getProjectsList, configurePermitPolicy, activatePermitPolicy };

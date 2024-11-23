import { apiCall } from '../api.js';
import { PERMIT_API_URL } from '../../config.js';
import ssh from 'micro-key-producer/ssh.js';
import { randomBytes } from 'micro-key-producer/utils.js';

type Project = {
	key: string;
	urn_namespace: string;
	id: string;
	organization_id: string;
	created_at: string;
	updated_at: string;
	name: string;
};
type Repo = {
	status: string;
	key: string;
};

async function getProjectList(apiKey: string): Promise<Project[]> {
	const projects = await apiCall('v2/projects', apiKey);
	if (projects.status !== 200) {
		throw new Error(`Failed to fetch projects: ${projects.response}`);
	}
	return projects.response as Project[];
}

async function getRepoList(
	apiKey: string,
	projectKey: string,
): Promise<Repo[]> {
	const Repos = await apiCall(`v2/projects/${projectKey}/repos`, apiKey);
	return Repos.response as Repo[];
}

function generateSSHKey() {
	const seed = randomBytes(32);
	return ssh(seed, 'help@permit.io');
}
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

async function configurePermit(
	accessToken: string,
	projectKey: string,
	gitconfig: GitConfig,
) {
	const endpoint = `v2/projects/${projectKey}/repos`;
	const body = gitconfig;
	const options: RequestInit = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	};
	const resp = await fetch(`${PERMIT_API_URL}/${endpoint}`, options);
	const response = await resp.json();
	if (resp.status === 422) {
		throw new Error('Validation Error');
	}
	const gitConfigResponse = response;
	return {
		id: gitConfigResponse.id,
		key: gitConfigResponse.key,
		status: gitConfigResponse.status,
	};
}

async function activateRepo(
	accessToken: string,
	projectKey: string,
	repoId: string,
): Promise<boolean> {
	const activateResponse = await apiCall(
		`v2/projects/${projectKey}/repos/${repoId}/activate`,
		accessToken,
		'',
		'PUT',
	);
	if (activateResponse.status === 400) {
		throw new Error('Invalid Repo Status');
	}
	return true;
}

export {
	getProjectList,
	getRepoList,
	generateSSHKey,
	configurePermit,
	activateRepo,
};

import { apiCall } from '../api.js';

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
export { getProjectList, getRepoList };

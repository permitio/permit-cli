import { components } from '../lib/api/v1.js';
import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

// type Project = {
// 	key: string;
// 	urn_namespace: string;
// 	id: string;
// 	organization_id: string;
// 	created_at: string;
// 	updated_at: string;
// 	name: string;
// };
// type Repo = {
// 	status: string;
// 	key: string;
// };

// async function getProjectList(apiKey: string): Promise<Project[]> {
// 	const projects = await apiCall('v2/projects', apiKey);
// 	if (projects.status !== 200) {
// 		throw new Error(`Failed to fetch projects: ${projects.response}`);
// 	}
// 	return projects.response as Project[];
// }

export type PolicyRepoCreate = components['schemas']['PolicyRepoCreate'];
export type PolicyRepoRead = components['schemas']['PolicyRepoRead'];

// async function getRepoList(projectKey: string) {
// 	return await authenticatedApiClient.client.GET(`/v2/projects/{proj_id}/repos`, {
// 		params: {
// 			path: {
// 				proj_id: projectKey,
// 			},
// 		},
// 	});
// }
//
//
// type GitConfig = {
// 	url: string;
// 	mainBranchName: string;
// 	credentials: {
// 		authType: 'ssh';
// 		username: string;
// 		privateKey: string;
// 	};
// 	key: string;
// 	activateWhenValidated: boolean;
// };
//
// async function configurePermit(
// 	projectKey: string,
// 	gitconfig: GitConfig,
// ) {
// 	const endpoint = `/v2/projects/{proj_id}/repos`;
// 	const body: PolicyRepoCreate = {
// 		url: gitconfig.url,
// 		main_branch_name: gitconfig.mainBranchName,
// 		credentials: {
// 			auth_type: gitconfig.credentials.authType,
// 			username: gitconfig.credentials.username,
// 			private_key: gitconfig.credentials.privateKey,
// 		},
// 		key: gitconfig.key,
// 		activate_when_validated: gitconfig.activateWhenValidated,
// 	};
// 	return await authenticatedApiClient.client.POST(endpoint, {
// 		params: {
// 			path: {
// 				proj_id: projectKey,
// 			},
// 		},
// 		body: body,
// 	});

// if (response.status === 422) {
// 	throw new Error('Validation Error in Configuring Permit');
// }
// if (response.status === 200) {
// 	const gitConfigResponse = response.response as {
// 		id: string;
// 		key: string;
// 		status: string;
// 	};
// 	return {
// 		id: gitConfigResponse.id,
// 		key: gitConfigResponse.key,
// 		status: gitConfigResponse.status,
// 	};
// } else {
// 	throw new Error('Invalid Configuration ');
// }
// }

// export {
// 	// getProjectList,
// 	getRepoList,
// 	configurePermit,
// 	GitConfig,
// };

export type GitConfig = {
	url: string;
	mainBranchName: string;
	credentials: {
		authType: 'ssh';
		username: string;
		privateKey: string;
	};
	key: string;
	activateWhenValidated: boolean;
};

export const usePolicyGitReposApi = () => {
	const { authenticatedApiClient } = useClient();

	const getRepoList = useCallback(
		async (projectKey: string) => {
			return await authenticatedApiClient().GET(
				`/v2/projects/{proj_id}/repos`,
				{ proj_id: projectKey },
			);
		},
		[authenticatedApiClient],
	);

	const configurePermit = useCallback(
		async (projectKey: string, gitconfig: GitConfig) => {
			const endpoint = `/v2/projects/{proj_id}/repos`;
			const body: PolicyRepoCreate = {
				url: gitconfig.url,
				main_branch_name: gitconfig.mainBranchName,
				credentials: {
					auth_type: gitconfig.credentials.authType,
					username: gitconfig.credentials.username,
					private_key: gitconfig.credentials.privateKey,
				},
				key: gitconfig.key,
				activate_when_validated: gitconfig.activateWhenValidated,
			};
			return await authenticatedApiClient().POST(
				endpoint,
				{ proj_id: projectKey },
				body,
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getRepoList,
			configurePermit,
		}),
		[configurePermit, getRepoList],
	);
};

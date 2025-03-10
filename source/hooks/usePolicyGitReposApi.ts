import { components } from '../lib/api/v1.js';
import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

export type PolicyRepoCreate = components['schemas']['PolicyRepoCreate'];
export type PolicyRepoRead = components['schemas']['PolicyRepoRead'];

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

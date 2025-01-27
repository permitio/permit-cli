import { apiCall } from '../api.js';
import ssh from 'micro-key-producer/ssh.js';
import { randomBytes } from 'micro-key-producer/utils.js';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('lib.gitops.utils');

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
		throw new Error(
			i18n('getProjectList.error', { response: projects.response }),
		);
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
	mainBranchName: string;
	credentials: {
		authType: string;
		username: string;
		privateKey: string;
	};
	key: string;
	activateWhenValidated: boolean;
};

async function configurePermit(
	apiKey: string,
	projectKey: string,
	gitconfig: GitConfig,
) {
	const endpoint = `v2/projects/${projectKey}/repos`;
	const body = {
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
	const response = await apiCall(
		endpoint,
		apiKey,
		'',
		'POST',
		JSON.stringify(body),
	);
	if (response.status === 422) {
		throw new Error(i18n('configurePermit.validationError'));
	}
	if (response.status === 200) {
		const gitConfigResponse = response.response as {
			id: string;
			key: string;
			status: string;
		};
		return {
			id: gitConfigResponse.id,
			key: gitConfigResponse.key,
			status: gitConfigResponse.status,
		};
	} else {
		throw new Error(i18n('configurePermit.invalidError'));
	}
}

export {
	getProjectList,
	getRepoList,
	generateSSHKey,
	configurePermit,
	GitConfig,
};

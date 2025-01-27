import React, { useState, useCallback, useEffect } from 'react';
import RepositoryKey from './RepositoryKey.js';
import SSHKey from './SSHKey.js';
import BranchName from './BranchName.js';
import { Box, Text } from 'ink';
import { configurePermit, GitConfig } from '../../lib/gitops/utils.js';
import { useAuth } from '../AuthProvider.js';
import SelectProject from '../SelectProject.js';
import { ActiveState } from '../EnvironmentSelection.js';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('gitops.create.github');
type Props = {
	authKey: string | undefined;
	inactivateWhenValidated: boolean | undefined;
};
const GitHubComponent: React.FC<Props> = ({
	authKey,
	inactivateWhenValidated,
}) => {
	const [error, setError] = useState<string>('');
	const [projectKey, setProjectKey] = useState<string>('');
	const [doneMessage, setDoneMessage] = useState<string>('');
	const [gitConfig, setGitConfig] = useState<GitConfig>({
		url: '',
		mainBranchName: '',
		credentials: {
			authType: 'ssh',
			username: 'git',
			privateKey: '',
		},
		key: '',
		activateWhenValidated: !inactivateWhenValidated,
	});
	const [ApiKey, setApiKey] = useState<string>('');
	const [state, setState] = useState<
		| 'apiKey'
		| 'repositoryKey'
		| 'sshKey'
		| 'branch'
		| 'project'
		| 'done'
		| 'error'
	>('apiKey');
	const { authToken } = useAuth();
	const apiKeyRender = useCallback(() => {
		if (authKey) {
			setApiKey(authKey);
			setState('project');
		} else {
			try {
				setApiKey(authToken);
				setState('project');
			} catch (error) {
				setError(error instanceof Error ? error.message : String(error));
				setState('error');
			}
		}
	}, [authKey, setApiKey, setState, authToken]);
	useEffect(() => {
		apiKeyRender();
	}, [apiKeyRender]);

	const handleProjectSelect = useCallback((project: ActiveState) => {
		setProjectKey(project.value);
		setState('repositoryKey');
	}, []);

	const handleProjectSelectionError = useCallback((error: string) => {
		setError(error);
		setState('error');
	}, []);

	return (
		<>
			<Box margin={1}>
				<Text>{i18n('title')}</Text>
			</Box>

			{state === 'project' && (
				<SelectProject
					onError={handleProjectSelectionError}
					onComplete={handleProjectSelect}
					accessToken={ApiKey}
				/>
			)}

			{state === 'repositoryKey' && (
				<RepositoryKey
					projectName={projectKey}
					apiKey={ApiKey}
					onError={errormessage => {
						setError(errormessage);
						setState('error');
					}}
					onRepoKeySubmit={policyName => {
						setGitConfig({
							...gitConfig,
							key: policyName,
						});
						setState('sshKey');
					}}
				/>
			)}
			{state === 'sshKey' && (
				<SSHKey
					onError={errormessage => {
						setError(errormessage);
						setState('error');
					}}
					onSSHKeySubmit={(sshkey: string, sshUrl: string) => {
						setGitConfig({
							...gitConfig,
							credentials: {
								...gitConfig.credentials,
								privateKey: sshkey,
							},
							url: sshUrl,
						});
						setState('branch');
					}}
				/>
			)}
			{state === 'branch' && (
				<BranchName
					onError={(errormessage: string) => {
						setError(errormessage);
						setState('error');
					}}
					onBranchSubmit={async (branchName: string) => {
						const updatedGitConfig = {
							...gitConfig,
							mainBranchName: branchName,
						};
						try {
							const configResponse = await configurePermit(
								ApiKey,
								projectKey,
								updatedGitConfig,
							);
							if (configResponse.status === 'invalid') {
								setError(i18n('invalidConfig.message'));
								setState('error');
								return;
							}
						} catch (error) {
							setError(error instanceof Error ? error.message : String(error));
							setState('error');
							return;
						}
						setState('done');
						if (gitConfig.activateWhenValidated) {
							setDoneMessage(i18n('activatedOnceValidated.message'));
							return;
						}
						setDoneMessage(i18n('success.message'));
					}}
				/>
			)}

			{state === 'done' && (
				<Box margin={1}>
					<Text color={'green'}>{doneMessage}</Text>
				</Box>
			)}

			{state === 'error' && (
				<Box margin={1}>
					<Text color={'red'}>{'Error: ' + error}</Text>
				</Box>
			)}
		</>
	);
};

export default GitHubComponent;

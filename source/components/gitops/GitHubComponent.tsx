import React, { useState, useCallback } from 'react';
import SelectProject from './SelectProject.js';
import RepositoryKey from './RepositoryKey.js';
import SSHKey from './SSHKey.js';
import BranchName from './BranchName.js';
import Activate from './Activate.js';
import { Box, Text } from 'ink';
import { configurePermit, gitConfig } from '../../lib/gitops/utils.js';
import { useAuth } from '../AuthProvider.js';
type Props = {
	authKey: string | undefined;
};
const GitHubComponent: React.FC<Props> = ({ authKey }) => {
	const [error, setError] = useState<string>('');
	const [projectKey, setProjectKey] = useState<string>('');
	const [doneMessage, setDoneMessage] = useState<string>('');
	const [gitConfig, setGitConfig] = useState<gitConfig>({
		url: '',
		mainBranchName: '',
		credentials: {
			authType: 'ssh',
			username: 'git',
			privateKey: '',
		},
		key: '',
	});
	const [ApiKey, setApiKey] = useState<string>('');
	const [state, setState] = useState<
		| 'apiKey'
		| 'repositoryKey'
		| 'sshKey'
		| 'branch'
		| 'project'
		| 'activate'
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
	if (state === 'apiKey') {
		apiKeyRender();
	}
	return (
		<>
			<Box margin={1}>
				<Text>GitOps Configuration Wizard - GitHub</Text>
			</Box>

			{state === 'project' && (
				<SelectProject
					accessToken={ApiKey}
					onError={(errorMessage: string) => {
						setError(errorMessage);
						setState('error');
					}}
					onProjectSubmit={(projectIdKey: string) => {
						setProjectKey(projectIdKey);
						setState('repositoryKey');
					}}
				/>
			)}

			{state === 'repositoryKey' && (
				<RepositoryKey
					projectName={projectKey}
					accessToken={ApiKey}
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
						setGitConfig({
							...gitConfig,
							mainBranchName: branchName,
						});
						const configResponse = await configurePermit(
							ApiKey,
							projectKey,
							gitConfig,
						);
						if (configResponse.status === 'invalid') {
							setError(
								'Invalid configuration. Please check the configuration and try again.',
							);
							setState('error');
							return;
						}
						setState('activate');
					}}
				/>
			)}
			{state === 'activate' && (
				<Activate
					apiKey={ApiKey}
					projectKey={projectKey}
					repoKey={gitConfig.key}
					onError={errormessage => {
						setError(errormessage);
						setState('error');
					}}
					onActivate={isConfigured => {
						if (isConfigured) {
							setDoneMessage(
								'Your GitOps is configured and activated sucessfully',
							);
						} else {
							setDoneMessage(
								'Your GitOps is configured successfully. To complete the setup, remember to activate it later.',
							);
						}
						setState('done');
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

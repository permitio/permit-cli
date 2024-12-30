import React, { useState, useCallback, useEffect } from 'react';
import SelectProject from './SelectProject.js';
import RepositoryKey from './RepositoryKey.js';
import SSHKey from './SSHKey.js';
import BranchName from './BranchName.js';
import { Box, Text } from 'ink';
import { configurePermit, GitConfig } from '../../lib/gitops/utils.js';
import { useAuth } from '../AuthProvider.js';
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
	return (
		<>
			<Box margin={1}>
				<Text>GitOps Configuration Wizard - GitHub</Text>
			</Box>

			{state === 'project' && (
				<SelectProject
					apiKey={ApiKey}
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
								setError(
									'Invalid configuration. Please check the configuration and try again.',
								);
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
							setDoneMessage(
								'Your GitOps is configured successfully and will be activated once validated',
							);
							return;
						}
						setDoneMessage(
							'Your GitOps is configured succesffuly. To complete the setup, remember to activate it later',
						);
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

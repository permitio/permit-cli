import React, { useState, useCallback, useEffect } from 'react';
import SelectProject from './SelectProject.js';
import RepositoryKey from './RepositoryKey.js';
import SSHKey from './SSHKey.js';
import BranchName from './BranchName.js';
import { Box, Text } from 'ink';
import { configurePermit, GitConfig } from '../../lib/gitops/utils.js';
import { useAuth } from '../AuthProvider.js';
import i18next from 'i18next';

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
				<Text>{i18next.t('gitOpsWizard.title')}</Text> {/* Localized Title */}
			</Box>

			{/* Project Selection */}
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

			{/* Repository Key Input */}
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

			{/* SSH Key Input */}
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

			{/* Branch Name Input */}
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
								setError(i18next.t('gitOpsWizard.invalidConfigError'));
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
							setDoneMessage(i18next.t('gitOpsWizard.configSuccessValidated'));
						} else {
							setDoneMessage(i18next.t('gitOpsWizard.configSuccessPending'));
						}
					}}
				/>
			)}

			{/* Done Message */}
			{state === 'done' && (
				<Box margin={1}>
					<Text color={'green'}>{doneMessage}</Text>
				</Box>
			)}

			{/* Error Message */}
			{state === 'error' && (
				<Box margin={1}>
					<Text color={'red'}>
						{i18next.t('gitOpsWizard.errorMessage', { error })}
					</Text>
				</Box>
			)}
		</>
	);
};

export default GitHubComponent;

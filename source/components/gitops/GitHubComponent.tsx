import React, { useState, useCallback } from 'react';
import RepositoryKey from './RepositoryKey.js';
import SSHKey from './SSHKey.js';
import BranchName from './BranchName.js';
import { Box, Text } from 'ink';
import SelectProject from '../SelectProject.js';
import { ActiveState } from '../EnvironmentSelection.js';
import {
	usePolicyGitReposApi,
	GitConfig,
} from '../../hooks/usePolicyGitReposApi.js';
type Props = {
	inactivateWhenValidated: boolean | undefined;
};
const GitHubComponent: React.FC<Props> = ({ inactivateWhenValidated }) => {
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
	const { configurePermit } = usePolicyGitReposApi();
	const [state, setState] = useState<
		'repositoryKey' | 'sshKey' | 'branch' | 'project' | 'done' | 'error'
	>('project');

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
				<Text>GitOps Configuration Wizard - GitHub</Text>
			</Box>

			{state === 'project' && (
				<SelectProject
					onError={handleProjectSelectionError}
					onComplete={handleProjectSelect}
				/>
			)}

			{state === 'repositoryKey' && (
				<RepositoryKey
					projectName={projectKey}
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

						const { data: configResponse, error } = await configurePermit(
							projectKey,
							updatedGitConfig,
						);

						if (error) {
							setError(error);
							setState('error');
							return;
						}

						if (configResponse?.status === 'invalid') {
							setError(
								'Invalid configuration. Please check the configuration and try again.',
							);
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

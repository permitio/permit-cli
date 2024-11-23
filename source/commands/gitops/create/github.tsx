import React, { useState } from 'react';
import ApiToken from '../../../components/gitops/APIToken.js';
import { Box, Text } from 'ink';
import SelectProject from '../../../components/gitops/SelectProject.js';
import PolicyName from '../../../components/gitops/PolicyName.js';
import SSHKey from '../../../components/gitops/SSHKey.js';
import BranchName from '../../../components/gitops/BranchName.js';
import Activate from '../../../components/gitops/Activate.js';
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

export default function GitHub() {
	const [error, setError] = useState<string>('');
	const [projectKey, setProjectKey] = useState<string>('');
	const [doneMessage, setDoneMessage] = useState<string>('');
	const [gitConfig, setGitConfig] = useState<GitConfig>({
		url: '',
		main_branch_name: '',
		credentials: {
			auth_type: 'ssh',
			username: 'git',
			private_key: '',
		},
		key: '',
	});
	const [ApiKey, setApiKey] = useState<string>('');
	const [state, setState] = useState<
		| 'api_key'
		| 'policy_name'
		| 'ssh_key'
		| 'branch'
		| 'project'
		| 'activate'
		| 'done'
		| 'error'
	>('api_key');

	return (
		<>
			<Box margin={1}>
				<Text color={'yellow'}>Welcome to GitOps Wizard</Text>
			</Box>
			{state === 'api_key' && (
				<ApiToken
					onApiKeySubmit={AccessToken => {
						setApiKey(AccessToken);
						setState('project');
					}}
					onError={errormsg => {
						setError(errormsg);
						setState('error');
					}}
				/>
			)}

			{state === 'project' && (
				<SelectProject
					accessToken={ApiKey}
					onError={(errorMessage: string) => {
						setError(errorMessage);
						setState('error');
					}}
					onProjectSubmit={(projectIdKey: string) => {
						setProjectKey(projectIdKey);
						setState('policy_name');
					}}
				/>
			)}

			{state === 'policy_name' && (
				<PolicyName
					projectName={projectKey}
					accessToken={ApiKey}
					onError={errormessage => {
						setError(errormessage);
						setState('error');
					}}
					onPolicyNameSubmit={policyName => {
						setGitConfig({
							...gitConfig,
							key: policyName,
						});
						setState('ssh_key');
					}}
				/>
			)}
			{state === 'ssh_key' && (
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
								private_key: sshkey,
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
					onBranchSubmit={(branchName: string) => {
						setGitConfig({
							...gitConfig,
							main_branch_name: branchName,
						});
						setState('activate');
					}}
				/>
			)}
			{state === 'activate' && (
				<Activate
					accessToken={ApiKey}
					projectKey={projectKey}
					config={gitConfig}
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
							setDoneMessage('Your GitOps is configured successfully');
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
}

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import zod from 'zod';
import { option } from 'pastel';
import SelectProject from '../../../components/gitops/SelectProject.js';
import PolicyName from '../../../components/gitops/PolicyName.js';
import SSHKey from '../../../components/gitops/SSHKey.js';
import BranchName from '../../../components/gitops/BranchName.js';
import Activate from '../../../components/gitops/Activate.js';
import {
	KEYSTORE_PERMIT_SERVICE_NAME,
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
} from '../../../config.js';
import * as keytar from 'keytar';

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
export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'The API key for the permit Environment Organization or Project',
				alias: 'k',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function GitHub({ options }: Props) {
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
	useEffect(() => {
		if (options.key) {
			setApiKey(options.key);
			setState('project');
		} else {
			keytar
				.getPassword(
					KEYSTORE_PERMIT_SERVICE_NAME,
					DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
				)
				.then(apiKey => {
					if (!apiKey) {
						setState('error');
						setError(
							'API Key not found in the keychain and not passed as an argument',
						);
						return;
					}
					setApiKey(apiKey);
					setState('project');
				})
				.catch(error => {
					setError(error.message);
					setState('error');
				});
		}
	}, []);

	return (
		<>
			<Box margin={1}>
				<Text color={'yellow'}>Welcome to GitOps Wizard</Text>
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

import React, { useState, useEffect } from 'react';
import ApiToken from '../../../components/gitops/APIToken.js';
import { Box, Text } from 'ink';
import SelectProject from '../../../components/gitops/SelectProject.js';
import PolicyName from '../../../components/gitops/PolicyName.js';
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
	const [gitConfig, setGitConfig] = useState<GitConfig>({
		url: '',
		main_branch_name: '',
		credentials: {
			auth_type: '',
			username: '',
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

			{state === 'error' && (
				<Box margin={1}>
					<Text color={'red'}>{'Error: ' + error}</Text>
				</Box>
			)}
		</>
	);
}

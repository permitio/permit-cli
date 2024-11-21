import React, { useState, useEffect } from 'react';
import ApiToken from '../../../components/gitops/APIToken.js';
import { Box, Text } from 'ink';

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
						setState('policy_name');
					}}
					onError={errormsg => {
						setError(errormsg);
						setState('error');
					}}
				/>
			)}

			

			{state === 'error' && (
				<Box margin={1}>
					<Text color={'red'}>{"Error: "+error}</Text>
				</Box>
			)}
		</>
	);
}

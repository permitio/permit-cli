import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import GenerateKeyGen from '../../../lib/ssh-gen.js';
import TextInput, { UncontrolledTextInput } from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { apiCall } from '../../../lib/api.js';
import * as crypto from 'crypto';

type GitOpsConfig = {
	url: string;
	main_branch_name: string;
	credentials: {
		auth_type: string;
		username: string;
		private_key: string;
	};
	key: string;
};

type ProjectResponse = {
	key: string;
	urn_namespace: string;
	name: string;
};

export default function Github() {
	const [currstate, setCurrState] = useState<
		'email' | 'ssh' | 'sshurl' | 'branch' | 'done' | 'key' | 'listProjects'
	>('email');
	const [key, setKey] = useState({
		publicKey: '',
		privateKey: '',
		fingerprint: '',
	});
	const [projects, setProjects] = useState<ProjectResponse[]>([]);
	const [projectList, setProjectList] =
		useState<{ label: string; value: string }[]>();
	const [authorizationKey, setAuthorizationKey] = useState('');
	const [projectKey, setProjectKey] = useState('');
	const [gitOpsConfig, setGitOpsConfig] = useState<GitOpsConfig>({
		url: '',
		main_branch_name: '',
		credentials: {
			auth_type: 'ssh',
			username: 'git',
			private_key: '',
		},
		key: crypto.randomBytes(20).toString('hex'),
	});

	// Handle Email Submission and SSH Key Generation
	const handleEmailSubmit = (email: string) => {
		const generatedKey = GenerateKeyGen(email);
		setKey(generatedKey);
		setCurrState('ssh'); // Move to SSH state after generating the key
	};

	// Update gitOpsConfig when we get the SSH URL
	const handleSSHSubmit = (sshurl: string) => {
		setGitOpsConfig(prevConfig => ({
			...prevConfig,
			url: sshurl,
		}));
		setCurrState('branch');
	};

	// Update gitOpsConfig when we get the main branch name
	const handleBranchSubmit = (branch: string) => {
		setGitOpsConfig(prevConfig => ({
			...prevConfig,
			main_branch_name: branch,
		}));
		setCurrState('key');
	};

	// Update gitOpsConfig when we select a project
	const handleSelectProject = (item: { label: string; value: string }) => {
		setProjectKey(item.value);
		configurePermit();
	};
	// API call to configure:

	const configurePermit = () => {
		//To implement the configure of the permit and activate it.
	};

	// API Call to the permit.io with the key.
	const handleAuthorizationKey = (key: string) => {
		setAuthorizationKey(key);
	};

	useEffect(() => {
		apiCall('v2/projects', authorizationKey).then(res => {
			if (res.status === 200) {
				console.log(res.response);
				const val = res.response;
				console.log(val.length);
				for (let i = 0; i < val.length; i++) {
					setProjects(prevProjects => [
						...prevProjects,
						{
							key: val[i].id,
							urn_namespace: val[i].urn_namespace,
							name: val[i].name,
						},
					]);
					setCurrState('listProjects');
				}
			} else if (res.status === 404) {
				console.log('Not Found');
			}
		});
	}, [authorizationKey]);

	// Update the items to list:
	useEffect(() => {
		const items = projects.map(project => ({
			label: project.name,
			value: project.key,
		}));
		setProjectList(items);
	}, [projects]);

	// Update gitOpsConfig when privateKey is available after key generation
	useEffect(() => {
		if (key.privateKey !== '') {
			setGitOpsConfig(prevConfig => ({
				...prevConfig,
				credentials: { ...prevConfig.credentials, private_key: key.privateKey },
			}));
		}
	}, [key.privateKey]);

	return (
		<>
			<Box margin={2} padding={2}>
				<Text color={'greenBright'} bold>
					Welcome to GitOps flow in GitHub
				</Text>
			</Box>
			{currstate === 'email' && (
				<Box>
					<Box marginRight={1}>
						<Text color={'magenta'}>Enter your email:</Text>
					</Box>
					<UncontrolledTextInput onSubmit={handleEmailSubmit} />
				</Box>
			)}
			{currstate === 'ssh' && (
				<Box flexDirection="column">
					<Text color={'blueBright'}>
						SSH Key Generated! Add the following key to GitHub:
					</Text>
					<Text color={'yellow'}>Public Key: {key.publicKey}</Text>
					<Box marginTop={1}>
						<Text color={'magenta'}>Enter your repository SSH URL:</Text>
						<UncontrolledTextInput onSubmit={handleSSHSubmit} />
					</Box>
				</Box>
			)}
			{currstate === 'branch' && (
				<Box flexDirection="column">
					<Text color={'blueBright'}>
						Your SSH URL has been set to: {gitOpsConfig.url}
					</Text>
					<Box marginTop={1}>
						<Text color={'magenta'}>Enter your main branch name:</Text>
						<UncontrolledTextInput onSubmit={handleBranchSubmit} />
					</Box>
				</Box>
			)}
			{currstate === 'key' && (
				<Box flexDirection="column">
					<Text color={'blueBright'}>
						Your main branch name has been set to:{' '}
						{gitOpsConfig.main_branch_name}
					</Text>
					<Box margin={1}>
						<Text color={'magenta'}>
							Enter your Authorization Key (API KEY OF PROJECT OR ORGANIZATION){' '}
						</Text>
						<TextInput
							value={authorizationKey}
							onChange={handleAuthorizationKey}
						/>
					</Box>
				</Box>
			)}
			{currstate === 'listProjects' && (
				<Box flexDirection="column">
					<Text color={'blueBright'}>List of Projects To Select From :</Text>
					<SelectInput items={projectList} onSelect={handleSelectProject} />
				</Box>
			)}
		</>
	);
}

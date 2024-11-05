import React, { useEffect, useState } from 'react';
import keytar from 'keytar';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import {
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	KEYSTORE_PERMIT_SERVICE_NAME,
} from '../../../config.js';
import GenerateKeyGen from '../../../lib/ssh-gen.js';
import {
	getProjectsList,
	configurePermitPolicy,
	activatePermitPolicy,
} from '../../../lib/gitops/utils.js';

type ProjectSelect = {
	label: string;
	value: string;
};
type ActivateSelect = {
	label: string;
	value: boolean;
};

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

export default function Github() {
	const [apiKey, setApiKey] = useState('');
	const [policyRepoKey, setPolicyRepoKey] = useState('');
	const [branch, setBranch] = useState('');
	const [state, setState] = useState<
		| 'initial'
		| 'sshurl'
		| 'branch'
		| 'project'
		| 'noAPI'
		| 'activate'
		| 'done'
		| 'error'
	>('noAPI');
	const [projects, setProjects] = useState<ProjectSelect[]>([]);
	const [selectedProject, setSelectedProject] = useState('');
	const [gitHubConfig, setGitHubConfig] = useState<GitConfig>();
	const [errorMessage, setErrorMessage] = useState('');
	const [activateMessage, setActivateMessage] = useState('');
	const [policyConfigResponse, setPolicyConfigResponse] = useState({
		id: '',
		key: '',
		status: '',
	});

	const [sshKey, setSshKey] = useState({
		publicKey: '',
		fingerprint: '',
		privateKey: '',
	});
	const [sshURL, setSshURL] = useState('');
	const activateItemSelect = [
		{
			label: 'Yes',
			value: true,
		},
		{
			label: 'No',
			value: false,
		},
	];
	useEffect(() => {
		if (apiKey === '') {
			keytar
				.getPassword(
					KEYSTORE_PERMIT_SERVICE_NAME,
					DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
				)
				.then(value => setApiKey(value || 'empty'))
				.catch(reason =>
					setApiKey(`-- Failed to read key - reason: ${reason}`),
				);
		}
		if (apiKey !== 'empty' && apiKey.startsWith('permit')) {
			setState('initial');
		}
		setSshKey(GenerateKeyGen());
	}, [apiKey]);

	useEffect(() => {
		if (apiKey !== 'empty' && apiKey.startsWith('permit')) {
			getProjectsList(apiKey)
				.then(projects => {
					const projectList = projects.map(project => ({
						label: project.name,
						value: project.key,
					}));
					setProjects(projectList);
				})
				.catch(err => console.log(err));
		}
	}, [apiKey]);

	useEffect(() => {
		if (gitHubConfig) {
			configurePermitPolicy(apiKey, selectedProject, gitHubConfig)
				.then(response => {
					setPolicyConfigResponse(response);
					if (response.status === 'invalid') {
						setState('error');
						setErrorMessage('Invalid Configuration');
					} else {
						setState('activate');
					}
				})
				.catch(err => console.log(err));
		}
	}, [gitHubConfig]);

	const handleRepoKeySubmit = (repoKey: string) => {
		setPolicyRepoKey(repoKey);
		setState('sshurl');
	};
	const handleSshURLSubmit = (sshURL: string) => {
		setSshURL(sshURL);
		setState('branch');
	};

	const handleBranchSubmit = (branch: string) => {
		setBranch(branch);
		setState('project');
	};

	const handleProjectSelect = (project: ProjectSelect) => {
		setSelectedProject(project.value);
		setGitHubConfig({
			url: sshURL,
			main_branch_name: branch,
			credentials: {
				auth_type: 'ssh',
				username: 'git',
				private_key: sshKey.privateKey,
			},
			key: policyRepoKey,
		});
	};

	const handleActivateSelect = (activate: ActivateSelect) => {
		if (activate.value) {
			activatePermitPolicy(apiKey, selectedProject, policyConfigResponse.key)
				.then(response => {
					if (response) {
						setActivateMessage('Policy is Activated');
						setState('done');
					} else {
						setActivateMessage('Policy Activation Failed');
						setState('error');
						setErrorMessage('Policy Activation Failed');
					}
				})
				.catch(err => {
					setState('error');
					setErrorMessage(err);
				});
		}
	};

	return (
		<>
			<Box flexDirection="column" margin={2}>
				<Text color={'cyan'}>Welcome to Permit GitOps Configuration</Text>
			</Box>
			{apiKey === 'empty' && (
				<>
					<Text color={'red'}>No API Key is found in KeyStore. {'\n'}</Text>
					<Text color={'green'}>Please Enter the API Key. </Text>
					<TextInput value={apiKey} onChange={setApiKey} />
				</>
			)}
			{state === 'initial' && (
				<>
					<Text color={'green'}>
						Enter the name of the policy Configuration:
					</Text>
					<TextInput
						value={policyRepoKey}
						onChange={setPolicyRepoKey}
						onSubmit={handleRepoKeySubmit}
					/>
				</>
			)}
			{state === 'sshurl' && (
				<>
					<Text color={'magenta'}>
						Your Policy Configuration Name: {policyRepoKey}
						{'\n'}
					</Text>
					<Text color={'yellow'}>
						Copy this public SSH key and paste it in deploy keys section of
						GitHub Repo: {'\n'}{' '}
					</Text>
					<Text color={'yellow'}>
						Public Key: {sshKey.publicKey}
						{'\n'}
					</Text>
					<Text color={'green'}>Enter the SSH URL of the Repository:</Text>
					<TextInput
						value={sshURL}
						onChange={setSshURL}
						onSubmit={handleSshURLSubmit}
					/>
				</>
			)}
			{state === 'branch' && (
				<>
					<Text color={'magenta'}>
						{' '}
						Entered SSH URL: {sshURL} {'\n'}
					</Text>
					<Text color={'green'}>Enter the Branch Name:</Text>
					<TextInput
						value={branch}
						onChange={setBranch}
						onSubmit={handleBranchSubmit}
					/>
				</>
			)}
			{state === 'project' && (
				<>
					<Text color={'magenta'}>
						{' '}
						Entered Branch Name: {branch} {'\n'}
					</Text>
					<Text color={'green'}>Select the Project:</Text>
					<SelectInput items={projects} onSelect={handleProjectSelect} />
				</>
			)}
			{state === 'activate' && (
				<>
					<Text color={'magenta'}>
						{' '}
						Configuration is successfully updated. {'\n'} Check for the branches
						in Repository. {'\n'}
					</Text>
					<Text color={'green'}> Activate the Policy: </Text>
					<SelectInput
						items={activateItemSelect}
						onSelect={handleActivateSelect}
					/>
				</>
			)}
			{state === 'done' && (
				<>
					<Text color={'green'}> {activateMessage} </Text>
				</>
			)}
			{state === 'error' && (
				<>
					<Text color={'red'}> {errorMessage} </Text>
				</>
			)}
		</>
	);
}

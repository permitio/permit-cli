import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import zod from 'zod';
import { option } from 'pastel';
import SelectProject from '../../../components/gitops/SelectProject.js';
import RepositoryKey from '../../../components/gitops/RepositoryKey.js';
import SSHKey from '../../../components/gitops/SSHKey.js';
import BranchName from '../../../components/gitops/BranchName.js';
import Activate from '../../../components/gitops/Activate.js';
import {
	KEYSTORE_PERMIT_SERVICE_NAME,
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
} from '../../../config.js';
import * as keytar from 'keytar';

import { configurePermit, gitConfig } from '../../../lib/gitops/utils.js';
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
}

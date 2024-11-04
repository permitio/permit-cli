import React, { useEffect, useState } from 'react';
import keytar from 'keytar';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import {
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	KEYSTORE_PERMIT_SERVICE_NAME,
} from '../../../config.js';
import GenerateKeyGen from '../../../lib/ssh-gen.js';

export default function Github() {
	const [apiKey, setApiKey] = useState('');
	const [policyRepoKey, setPolicyRepoKey] = useState('');
	const [state, setState] = useState<
		'initial' | 'sshurl' | 'branch' | 'project' | 'noAPI'
	>('noAPI');
	const [sshKey, setSshKey] = useState({
		publicKey: '',
		fingerprint: '',
		privateKey: '',
	});
	const [sshURL, setSshURL] = useState('');
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

	const handleRepoKeySubmit = (repoKey: string) => {
		setPolicyRepoKey(repoKey);
		setState('sshurl');
	};
	const handleSshURLSubmit = (sshURL: string) => {
		setSshURL(sshURL);
		setState('branch');
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
		</>
	);
}

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { generateSSHKey } from '../../lib/gitops/utils.js';

type Props = {
	onSSHKeySubmit: (sshKey: string, sshUrl: string) => void;
	onError: (error: string) => void;
};

const SSHKey: React.FC<Props> = ({ onSSHKeySubmit, onError }) => {
	const [sshUrl, setSshUrl] = useState<string>('');
	const [sshKey, setSshKey] = useState<{
		publicKey: string;
		privateKey: string;
	}>({ publicKey: '', privateKey: '' });
	useEffect(() => {
		const key = generateSSHKey();
		setSshKey(key);
	}, []);
	const handleSSHSubmit = (sshUrl: string) => {
		if (sshUrl.length <= 1) {
			onError('Please enter a valid SSH URL');
			return;
		}
		const sshRegex = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9/_-]+\.git$/;
		if (!sshRegex.test(sshUrl)) {
			onError('Please enter a valid SSH URL');
			return;
		}
		onSSHKeySubmit(sshKey.privateKey, sshUrl);
	};

	return (
		<>
			<Box margin={1}>
				<Text color={'yellow'}>SSH Key Generated.</Text>
			</Box>
			<Box>
				<Text color={'yellow'}>
					{' '}
					Copy The Public Key to Github: {sshKey.publicKey}
					{'\n'}
				</Text>
			</Box>
			<Box margin={1}>
				<Text color={'green'}> Enter the SSH URL of the Repo: </Text>
				<TextInput
					value={sshUrl}
					onChange={setSshUrl}
					onSubmit={handleSSHSubmit}
				/>
			</Box>
		</>
	);
};

export default SSHKey;

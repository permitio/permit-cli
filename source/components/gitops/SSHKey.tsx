import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { generateSSHKey } from '../../lib/gitops/utils.js';
import clipboard from 'clipboardy';

type Props = {
	onSSHKeySubmit: (sshKey: string, sshUrl: string) => void;
	onError: (error: string) => void;
};
const SSHHelperMessage =
	'Go to https://github.com/{{organization}}/{{repository}}/settings/keys/new and create your new SSH key. You can also refer to https://docs.permit.io/integrations/gitops/github#create-a-repository for more details\n';

const SSHKey: React.FC<Props> = ({ onSSHKeySubmit, onError }) => {
	const [sshUrl, setSshUrl] = useState<string>('');
	const [sshKey, setSshKey] = useState<{
		publicKey: string;
		privateKey: string;
	}>({ publicKey: '', privateKey: '' });
	useEffect(() => {
		const key = generateSSHKey();
		setSshKey(key);
		clipboard.writeSync(key.publicKey);
	}, []);
	const handleSSHSubmit = useCallback(
		(sshUrl: string) => {
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
		},
		[sshKey, onSSHKeySubmit, onError],
	);

	return (
		<>
			<Box margin={1}>
				<Text>{SSHHelperMessage}</Text>
			</Box>
			<Box margin={1}>
				<Text>SSH Key Generated.</Text>
			</Box>
			<Box>
				<Text>
					{' '}
					Copy The Public Key to Github: {'\n'}
					{sshKey.publicKey}
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

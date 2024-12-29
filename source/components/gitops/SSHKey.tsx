import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { generateSSHKey } from '../../lib/gitops/utils.js';
import clipboard from 'clipboardy';
import i18next from 'i18next';

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
		clipboard.writeSync(key.publicKey);
	}, []);

	const handleSSHSubmit = useCallback(
		(sshUrl: string) => {
			if (sshUrl.length <= 1) {
				onError(i18next.t('sshKey.error.invalidUrl'));
				return;
			}
			const sshRegex = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9/_-]+\.git$/;
			if (!sshRegex.test(sshUrl)) {
				onError(i18next.t('sshKey.error.invalidUrl'));
				return;
			}
			onSSHKeySubmit(sshKey.privateKey, sshUrl);
		},
		[sshKey, onSSHKeySubmit, onError],
	);

	return (
		<>
			<Box margin={1}>
				<Text>{i18next.t('sshKey.helperMessage')}</Text>
			</Box>
			<Box margin={1}>
				<Text>{i18next.t('sshKey.generated')}</Text>
			</Box>
			<Box>
				<Text>
					{i18next.t('sshKey.copyPublicKey')}
					{sshKey.publicKey}
				</Text>
			</Box>
			<Box margin={1}>
				<Text color={'green'}>{i18next.t('sshKey.sshUrlPrompt')}</Text>
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

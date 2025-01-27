import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { generateSSHKey } from '../../lib/gitops/utils.js';
import clipboard from 'clipboardy';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('gitops.create.github');

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
				onError(i18n('invalidSshUrl.error'));
				return;
			}
			const sshRegex = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9/_-]+\.git$/;
			if (!sshRegex.test(sshUrl)) {
				onError(i18n('invalidSshUrl.error'));
				return;
			}
			onSSHKeySubmit(sshKey.privateKey, sshUrl);
		},
		[sshKey, onSSHKeySubmit, onError],
	);

	return (
		<>
			<Box margin={1}>
				<Text>
					{i18n('sshHelper.message', {
						url: 'https://github.com/{{organization}}/{{repository}}/settings/keys/new',
						moreDetailsUrl:
							'https://docs.permit.io/integrations/gitops/github#create-a-repository',
					})}
				</Text>
			</Box>
			<Box margin={1}>
				<Text>{i18n('sshKeyGenerated.message')}</Text>
			</Box>
			<Box>
				<Text>
					{' '}
					{i18n('copySshKey.message')}
					{'\n'}
					{sshKey.publicKey}
				</Text>
			</Box>
			<Box margin={1}>
				<Text color={'green'}>{i18n('enterSshUrl.message')}</Text>
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

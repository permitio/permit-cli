import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('gitops.create.github');

type Props = {
	onBranchSubmit: (branchName: string) => void;
	onError: (error: string) => void;
};

const BranchName: React.FC<Props> = ({ onBranchSubmit, onError }) => {
	const [branchName, setBranchName] = React.useState<string>('');
	const handleBranchSubmit = () => {
		if (branchName.length <= 1) {
			onError(i18n('invalidBranchName.message'));
			return;
		}
		onBranchSubmit(branchName);
	};

	return (
		<>
			<Box margin={1}>
				<Text color={'green'}>{i18n('enterBranchName.message')}</Text>
				<TextInput
					value={branchName}
					onChange={setBranchName}
					onSubmit={handleBranchSubmit}
				/>
			</Box>
		</>
	);
};

export default BranchName;

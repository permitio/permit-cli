import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import i18next from 'i18next';

type Props = {
	onBranchSubmit: (branchName: string) => void;
	onError: (error: string) => void;
};

const BranchName: React.FC<Props> = ({ onBranchSubmit, onError }) => {
	const [branchName, setBranchName] = React.useState<string>('');

	const handleBranchSubmit = () => {
		if (branchName.length <= 1) {
			onError(i18next.t('branchName.errorMessage')); // Localized error message
			return;
		}
		onBranchSubmit(branchName);
	};

	return (
		<>
			<Box margin={1}>
				<Text color={'green'}>{i18next.t('branchName.prompt')}</Text>{' '}
				{/* Localized prompt */}
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

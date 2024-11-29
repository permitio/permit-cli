import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

type Props = {
	onBranchSubmit: (branchName: string) => void;
	onError: (error: string) => void;
};

const BranchName: React.FC<Props> = ({ onBranchSubmit, onError }) => {
	const [branchName, setBranchName] = React.useState<string>('');
	const handleBranchSubmit = () => {
		if (branchName.length <= 1) {
			onError('Please enter a valid branch name');
			return;
		}
		onBranchSubmit(branchName);
	};

	return (
		<>
			<Box margin={1}>
				<Text color={'green'}> Enter the Branch Name: </Text>
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

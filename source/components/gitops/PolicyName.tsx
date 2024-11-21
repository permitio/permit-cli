import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

type Props = {
	accessToken: string;
	onPolicyNameSubmit: (policyName: string) => void;
	onError: (error: string) => void;
};

const PolicyName: React.FC<Props> = ({
	accessToken,
	onPolicyNameSubmit,
	onError,
}) => {
	const Validate = (policyName: string): string => {
		if (policyName.length <= 1) {
			return 'Policy Name is required';
		}
		return '';
	};
	const [policyName, setPolicyName] = useState<string>('');

	const handleSubmit = (policyName: string) => {
		const error = Validate(policyName);
		if (error.length > 1) {
			onError(error);
			return;
		}
		onPolicyNameSubmit(policyName);
	};

	return (
		<>
			<Box>
				<Box marginRight={1}>
					<Text color={'blue'}> Enter Your Policy Name: </Text>
					<TextInput
						value={accessToken}
						onChange={setPolicyName}
						onSubmit={handleSubmit}
					/>
				</Box>
			</Box>
		</>
	);
};

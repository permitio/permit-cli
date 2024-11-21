import React, { useState } from 'react';
import TextInput from 'ink-text-input';
import { Box, Text } from 'ink';

type Props = {
	onApiKeySubmit: (apiKey: string) => void;
	onError: (error: string) => void;
};
const ApiToken: React.FC<Props> = ({ onApiKeySubmit, onError }) => {
	const Validate = (Token: string): string => {
		if (Token.length <= 1) {
			return 'API Key is required';
		}
		if (Token.length >= 97 && Token.startsWith('permit_key_')) {
			return '';
		}
		return 'Invalid API Key';
	};
	const [accessToken, setAccessToken] = useState<string>('');
	const handleSubmit = (apiToken: string) => {
		const error = Validate(apiToken);
		if (error.length > 1) {
			onError(error);
			return;
		}
		onApiKeySubmit(apiToken);
	};
	return (
		<>
			<Box>
				<Box marginRight={1}>
					<Text color={'blue'}> Enter Your API Key: </Text>
					<TextInput
						value={accessToken}
						onChange={setAccessToken}
						onSubmit={handleSubmit}
					/>
				</Box>
			</Box>
		</>
	);
};

export default ApiToken;

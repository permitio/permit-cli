import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { browserAuth, authCallbackServer, tokenType, TokenType } from '../lib/auth.js';
import { useAuthApi } from '../hooks/useAuthApi.js';

type LoginFlowProps = {
	apiKey?: string;
	onSuccess: (accessToken: string, cookie: string) => void;
	onError: (error: string) => void;
};

const LoginFlow: React.FC<LoginFlowProps> = ({ apiKey, onSuccess, onError }) => {
	const [loading, setLoading] = useState<boolean>(true);

	const { getLogin } = useAuthApi();
	const authenticateUser = async () => {

		if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
			onSuccess(apiKey, '');
		} else if (apiKey) {
			onError('Invalid API Key');
		} else {
			const verifier = await browserAuth();
			const token = await authCallbackServer(verifier);
			const { headers, error } = await getLogin(token);
			if (error) {
				onError(error);
			}
			onSuccess(token, headers.getSetCookie()[0] ?? '');
		}
	};

	useEffect(() => {
		setLoading(true);
		authenticateUser().then(_ => setLoading(false));
	}, [apiKey]);

	return loading ? (
		<Text>
			<Spinner type="dots" /> Logging in...
		</Text>
	) : (
		<Text>Login to Permit</Text>
	);
};

export default LoginFlow;

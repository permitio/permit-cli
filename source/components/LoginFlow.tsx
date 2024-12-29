import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { browserAuth, authCallbackServer } from '../lib/auth.js';
import { useAuthApi } from '../hooks/useAuthApi.js';
import { useApiKeyApi } from '../hooks/useApiKeyApi.js';
import i18next from 'i18next'; // Import i18next for localization

type LoginFlowProps = {
	apiKey?: string;
	onSuccess: (accessToken: string, cookie: string) => void;
	onError: (error: string) => void;
};

const LoginFlow: React.FC<LoginFlowProps> = ({
	apiKey,
	onSuccess,
	onError,
}) => {
	const [loading, setLoading] = useState<boolean>(true);

	const { getLogin } = useAuthApi();
	const { validateApiKey } = useApiKeyApi();

	useEffect(() => {
		const authenticateUser = async () => {
			if (apiKey && validateApiKey(apiKey)) {
				onSuccess(apiKey, '');
			} else if (apiKey) {
				onError(i18next.t('error.invalidApiKey'));
				return;
			} else {
				try {
					const verifier = await browserAuth();
					const token = await authCallbackServer(verifier);
					const { headers, error } = await getLogin(token);
					if (error) {
						onError(
							`${i18next.t('error.loginFailed')} ${error}. ${i18next.t('error.networkIssue')}`,
						);
						return;
					}
					onSuccess(token, headers.getSetCookie()[0] ?? '');
				} catch (error: unknown) {
					onError(`${i18next.t('error.unexpectedError')} ${error}`);
					return;
				}
			}
		};

		setLoading(true);
		authenticateUser();
		setLoading(false);
	}, [apiKey, getLogin, onError, onSuccess, validateApiKey]);

	return loading ? (
		<Text>
			<Spinner type="dots" /> {i18next.t('info.loggingIn')}
		</Text>
	) : (
		<Text>{i18next.t('info.loginPrompt')}</Text>
	);
};

export default LoginFlow;

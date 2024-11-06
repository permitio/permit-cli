import React, { useEffect, useState } from 'react';
import { Newline, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { apiCall } from '../../utils/apiCall.js';

import { saveAuthToken, TokenType, tokenType } from '../../lib/token.js';
import open from 'open';
import { APIError } from '../../errors/errors.js';
import { getOrgs, Organization } from '../../lib/organization.js';
import { getProjects, Project } from '../../lib/project.js';
import { Environment } from '../../lib/environment.js';
import { getEnvironments } from '../../lib/environment.js';
import { logIn } from '../../lib/login.js';
import EnvironmentSelect from '../environment/select.js';

export const options = object({
	key: string()
		.optional()
		.describe(
			option({
				description: 'Use API key instead of user authentication',
				alias: 'k',
			}),
		),
	workspace: string()
		.optional()
		.describe(
			option({
				description: 'Use predefined workspace to Login',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Login({ options: { key: apiKey, workspace } }: Props) {
	enum State {
		Login = 'login',
		LoggingIn = 'loggingIn',
		Done = 'done',
		Failed = 'failed',
	}
	const [state, setState] = useState<State>(State.Login);
	const [err, setError] = useState('');
	const [cookie, setCookie] = useState<string | undefined>('');
	const [accessToken, setAccessToken] = useState<string | undefined>();

	useEffect(() => {
		const authenticateUser = async () => {
			setState(State.LoggingIn);
			if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
				setAccessToken(apiKey);
			} else if (apiKey) {
				setError('Invalid API Key');
				setState(State.Failed);
			} else {
				const res = await logIn();
				if (res instanceof APIError) {
					setError(res.message);
					setState(State.Failed);
				} else {
					setAccessToken(res.accessToken);
					setCookie(res.cookie);
				}
			}

			setState(State.Done);
		};

		authenticateUser();
	}, [apiKey]);

	return (
		<>
			{state === State.Login && <Text>Login to Permit</Text>}
			{state === State.LoggingIn && (
				<Text>
					<Spinner type="dots" /> Logging in...
				</Text>
			)}
			{state === State.Done && (
				<EnvironmentSelect
					apiKey={apiKey ?? ''}
					accessToken={accessToken ?? ''}
					cookieProp={cookie}
					workspace={workspace ?? ''}
				/>
			)}
			{state === State.Failed && err && <Text>{err}</Text>}
		</>
	);
}

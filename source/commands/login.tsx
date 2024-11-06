import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { apiCall } from '../lib/api.js';
import {
	saveAuthToken,
} from '../lib/auth.js';
import LoginFlow from '../components/LoginFlow.js';
import EnvironmentSelection from '../components/EnvironmentSelection.js';

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

export default function Login({ options: { key, workspace } }: Props) {

	const [state, setState] = useState<'login' | 'env' | 'done'>('login');
	const [accessToken, setAccessToken] = useState<string>('');
	const [cookie, setCookie] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const [organization, setOrganization] = useState<string>('');
	const [project, setProject] = useState<string>('');
	const [environment, setEnvironment] = useState<string>('');

	const onEnvironmentSelectSuccess = async (organisation: string, project: string, environment: string, secret: string) => {
		setOrganization(organisation);
		setProject(project);
		setEnvironment(environment);
		await saveAuthToken(secret);
		setState('done');
		process.exit(1);
	};

	const onLoginSuccess = (accessToken: string, cookie: string) => {
		setAccessToken(accessToken);
		setCookie(cookie);
		setState('env');
	};

	const onError = (error: string) => {
		setError(error);
		process.exit(1);
	};

	return (
		<>
			{
				state == 'login' && <LoginFlow apiKey={key} onSuccess={onLoginSuccess} onError={onError} />
			}
			{
				state === 'env' &&
				<EnvironmentSelection accessToken={accessToken} cookie={cookie} onComplete={onEnvironmentSelectSuccess}
															onError={onError} workspace={workspace} />
			}
			{state === 'done' &&
				<Text>
					Logged in as {organization} with selected environment as {environment}
				</Text>
			}
			{
				error && <Text>{error}</Text>
			}
		</>
	);
}

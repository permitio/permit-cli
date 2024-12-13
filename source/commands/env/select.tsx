import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';

import { saveAuthToken } from '../../lib/auth.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import Login from '../login.js';
import { useApiKeyApi } from '../../hooks/useApiKeyApi.js';

export const options = zod.object({
	key: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: API Key to be used for the environment selection. In case not provided, CLI will redirect you to the Login.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Select({ options: { key: authToken } }: Props) {
	const [error, setError] = React.useState<string | null>(null);
	// const [authToken, setAuthToken] = React.useState<string | undefined>(apiKey);
	const [state, setState] = useState<
		'loading' | 'login' | 'selecting' | 'done'
	>('loading');
	const [environment, setEnvironment] = useState<string | null>(null);

	const { validateApiKey } = useApiKeyApi();

	useEffect(() => {
		if (error || (state === 'done' && environment)) {
			process.exit(1);
		}
	}, [error, state, environment]);

	useEffect(() => {
		if (!authToken) {
			setState('login');
		} else if (!validateApiKey(authToken)) {
			setError('Invalid API Key. Please provide a valid API Key.');
			return;
		} else {
			setState('selecting');
		}
	}, [authToken, validateApiKey]);

	const onEnvironmentSelectSuccess = async (
		_organisation: ActiveState,
		_project: ActiveState,
		environment: ActiveState,
		secret: string,
	) => {
		try {
			await saveAuthToken(secret);
		} catch (error: unknown) {
			setError(error as string);
		}
		setEnvironment(environment.label);
		setState('done');
	};

	const loginSuccess = useCallback(
		(
			_organisation: ActiveState,
			_project: ActiveState,
			environment: ActiveState,
		) => {
			setEnvironment(environment.label);
			setState('done');
		},
		[],
	);

	return (
		<>
			{state === 'loading' && (
				<Text>
					<Spinner type={'dots'} />
					Loading your environment
				</Text>
			)}
			{state === 'login' && (
				<>
					<Text>No Key provided, Redirecting to Login...</Text>
					<Login options={{}} loginSuccess={loginSuccess} />
				</>
			)}
			{authToken && state === 'selecting' && (
				<EnvironmentSelection
					accessToken={authToken}
					onComplete={onEnvironmentSelectSuccess}
					onError={setError}
				/>
			)}
			{state === 'done' && environment && (
				<Text>Environment: {environment} selected successfully</Text>
			)}
			{error && <Text>{error}</Text>}
		</>
	);
}

import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';

import { saveAuthToken } from '../../lib/auth.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import { useAuth } from '../AuthProvider.js';

export default function SelectComponent({ key }: { key: string | undefined }) {
	const [error, setError] = React.useState<string | null>(null);
	// const [authToken, setAuthToken] = React.useState<string | undefined>(apiKey);
	const [state, setState] = useState<'loading' | 'selecting' | 'done'>(
		'loading',
	);
	const [environment, setEnvironment] = useState<string | null>(null);
	const [authToken, setAuthToken] = useState<string | undefined>(key);

	const auth = useAuth();

	useEffect(() => {
		if (error || (state === 'done' && environment)) {
			process.exit(1);
		}
	}, [error, state, environment]);

	useEffect(() => {
		if (auth.authToken) {
			setAuthToken(auth.authToken);
			setState('selecting');
		}
	}, [auth.authToken]);

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

	return (
		<>
			{state === 'loading' && (
				<Text>
					<Spinner type={'dots'} />
					Loading your environment
				</Text>
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

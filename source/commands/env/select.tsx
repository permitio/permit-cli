import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';

import { saveAuthToken, TokenType, tokenType } from '../../lib/auth.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';

export const options = zod.object({
	key: zod.string().describe(
		option({
			description: 'API Key to be used for the environment selection',
		}),
	),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Select({ options: { key: apiKey } }: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<'loading' | 'selecting' | 'done'>(
		'loading',
	);
	const [environment, setEnvironment] = useState<string | null>(null);

	useEffect(() => {
		if (error || (state === 'done' && environment)) {
			process.exit(1);
		}
	}, [error, state, environment]);

	useEffect(() => {
		if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
			setAuthToken(apiKey);
		} else if (apiKey) {
			setError('Invalid API Key. Please provide a valid API Key.');
			return;
		}
		setState('selecting');
	}, [apiKey]);

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
					accessToken={apiKey}
					cookie={''}
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

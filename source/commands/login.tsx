import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { saveAuthToken, saveRegion } from '../lib/auth.js';
import { setRegion } from '../config.js';
import LoginFlow from '../components/LoginFlow.js';
import EnvironmentSelection, {
	ActiveState,
} from '../components/EnvironmentSelection.js';
import SignupComponent from '../components/signup/SignupComponent.js';

export const options = object({
	apiKey: string()
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
	region: string()
		.optional()
		.describe(
			option({
				description: 'Permit region: us or eu (default: us)',
				alias: 'r',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
	loginSuccess?: (
		organisation: ActiveState,
		project: ActiveState,
		environment: ActiveState,
		secret: string,
	) => void;
};

export default function Login({
	options: { apiKey, workspace, region },
	loginSuccess,
}: Props) {
	// Set region IMMEDIATELY before anything else (synchronously)
	if (region && (region === 'us' || region === 'eu')) {
		setRegion(region as 'us' | 'eu');
	}

	const [state, setState] = useState<'login' | 'signup' | 'env' | 'done'>(
		'login',
	);
	const [accessToken, setAccessToken] = useState<string>('');
	const [cookie, setCookie] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const [organization, setOrganization] = useState<string>('');
	const [environment, setEnvironment] = useState<string>('');

	// Save region to keystore after successful login
	useEffect(() => {
		if (region && (region === 'us' || region === 'eu')) {
			saveRegion(region as 'us' | 'eu');
		}
	}, [region]);

	const onEnvironmentSelectSuccess = useCallback(
		async (
			organisation: ActiveState,
			project: ActiveState,
			environment: ActiveState,
			secret: string,
		) => {
			setOrganization(organisation.label);
			setEnvironment(environment.label);
			await saveAuthToken(secret);
			if (loginSuccess) {
				loginSuccess(organisation, project, environment, secret);
				return;
			} else {
				setState('done');
			}
		},
		[loginSuccess],
	);

	const onSignupSuccess = useCallback(() => {
		setState('env');
	}, []);

	useEffect(() => {
		if (error === 'NO_ORGANIZATIONS') {
			setState('signup');
			setError(null);
		} else if (error || state === 'done') {
			setTimeout(() => {
				process.exit(1);
			}, 100);
		}
	}, [error, state]);

	const onLoginSuccess = useCallback((accessToken: string, cookie: string) => {
		setAccessToken(accessToken);
		setCookie(cookie);
		setState('env');
	}, []);

	return (
		<>
			{state == 'login' && (
				<LoginFlow
					apiKey={apiKey}
					onSuccess={onLoginSuccess}
					onError={setError}
				/>
			)}
			{state === 'env' && (
				<EnvironmentSelection
					accessToken={accessToken}
					cookie={cookie}
					onComplete={onEnvironmentSelectSuccess}
					onError={setError}
					workspace={workspace}
				/>
			)}
			{state === 'signup' && (
				<>
					<SignupComponent
						accessToken={accessToken}
						cookie={cookie}
						onSuccess={onSignupSuccess}
					/>
				</>
			)}
			{state === 'done' && (
				<Text>
					Logged in to {organization} with selected environment as {environment}
				</Text>
			)}
			{error && state !== 'signup' && <Text>{error}</Text>}
		</>
	);
}

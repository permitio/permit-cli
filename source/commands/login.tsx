import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import { type infer as zInfer, object, string } from 'zod';
import { option } from 'pastel';
import { saveAuthToken, saveRegion } from '../lib/auth.js';
import {
	isRetiredRegion,
	setRegion,
	EU_REGION_RETIRED_MESSAGE,
} from '../config.js';
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
				description: 'Permit region: us (default: us)',
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
	// A retired region (e.g. 'eu') is rejected before any request is made.
	const retiredRegion = isRetiredRegion(region);

	// Set region IMMEDIATELY before anything else (synchronously)
	if (region === 'us') {
		setRegion(region);
	}

	const [state, setState] = useState<'login' | 'signup' | 'env' | 'done'>(
		'login',
	);
	const [accessToken, setAccessToken] = useState<string>('');
	const [cookie, setCookie] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const [organization, setOrganization] = useState<string>('');
	const [environment, setEnvironment] = useState<string>('');

	useEffect(() => {
		if (retiredRegion) {
			setTimeout(() => {
				process.exit(1);
			}, 100);
		}
	}, [retiredRegion]);

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
			// Save region to keystore after successful login. 'us' is the only
			// region, so this also replaces a retired region (e.g. 'eu') left in
			// the keychain by an earlier login.
			try {
				await saveRegion('us');
			} catch (err) {
				setError(
					`Failed to save the region: ${err instanceof Error ? err.message : String(err)}`,
				);
				return;
			}
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

	if (retiredRegion) {
		return <Text>{EU_REGION_RETIRED_MESSAGE}</Text>;
	}

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

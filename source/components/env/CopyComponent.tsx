import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import { cleanKey } from '../../lib/env/copy/utils.js';
import { useAuth } from '../AuthProvider.js';

type Props = {
	from?: string;
	name?: string;
	description?: string;
	to?: string;
	conflictStrategy?: 'fail' | 'overwrite';
};

interface EnvCopyBody {
	existingEnvId?: string | null;
	newEnvKey?: string | null;
	newEnvName?: string | null;
	newEnvDescription?: string | null;
	conflictStrategy?: string | null;
}

export default function CopyComponent({
	from,
	to: envToId,
	name,
	description,
	conflictStrategy,
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<
		| 'loading'
		| 'selecting-env'
		| 'selecting-name'
		| 'selecting-description'
		| 'copying'
		| 'done'
	>('loading');
	const [projectFrom, setProjectFrom] = useState<string | null>(null);
	const [envToName, setEnvToName] = useState<string | undefined>(name);
	const [envFrom, setEnvFrom] = useState<string | undefined>(from);
	const [envToDescription, setEnvToDescription] = useState<string | undefined>(
		description,
	);

	// const { validateApiKeyScope } = useApiKeyApi();
	const { copyEnvironment } = useEnvironmentApi();

	const auth = useAuth();

	useEffect(() => {
		if (auth.error) {
			setError(auth.error);
			return;
		}
		if (!auth.loading) {
			setProjectFrom(auth.scope.project_id);
			setAuthToken(auth.authToken);
		}
	}, [auth]);

	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		const handleEnvCopy = async (envCopyBody: EnvCopyBody) => {
			let body = {};
			if (envCopyBody.existingEnvId) {
				body = {
					target_env: { existing: envCopyBody.existingEnvId },
				};
			} else if (envCopyBody.newEnvKey && envCopyBody.newEnvName) {
				body = {
					target_env: {
						new: {
							key: cleanKey(envCopyBody.newEnvKey),
							name: envCopyBody.newEnvName,
							description: envCopyBody.newEnvDescription ?? '',
						},
					},
				};
			}
			if (conflictStrategy) {
				body = {
					...body,
					conflict_strategy: envCopyBody.conflictStrategy ?? 'fail',
				};
			}
			const { error } = await copyEnvironment(
				projectFrom ?? '',
				envFrom ?? '',
				authToken ?? '',
				null,
				body,
			);
			if (error) {
				setError(`Error while copying Environment: ${error}`);
				return;
			}
			setState('done');
		};

		if (
			((envToName && envToDescription && conflictStrategy) || envToId) &&
			envFrom &&
			projectFrom &&
			authToken
		) {
			setState('copying');
			handleEnvCopy({
				newEnvKey: envToName,
				newEnvName: envToName,
				newEnvDescription: envToDescription,
				existingEnvId: envToId,
				conflictStrategy: conflictStrategy,
			});
		}
	}, [
		authToken,
		conflictStrategy,
		copyEnvironment,
		envFrom,
		envToDescription,
		envToId,
		envToName,
		projectFrom,
	]);

	const handleEnvFromSelection = useCallback(
		(
			_organisation_id: ActiveState,
			_project_id: ActiveState,
			environment_id: ActiveState,
		) => {
			setEnvFrom(environment_id.value);
		},
		[],
	);

	useEffect(() => {
		if (!envFrom) {
			setState('selecting-env');
		} else if (!envToName && !envToId) {
			setState('selecting-name');
		} else if (!envToDescription && !envToId) {
			setState('selecting-description');
		}
	}, [envFrom, envToDescription, envToId, envToName]);

	return (
		<>
			{state === 'selecting-env' && authToken && (
				<>
					<Text>Select an existing Environment to copy from.</Text>
					<EnvironmentSelection
						accessToken={authToken}
						cookie={''}
						onComplete={handleEnvFromSelection}
						onError={setError}
					/>
				</>
			)}
			{authToken && state === 'selecting-name' && (
				<>
					<Text>Input the new Environment name to copy to.</Text>
					<TextInput
						onSubmit={name => {
							setEnvToName(name);
						}}
						placeholder={'Enter name here...'}
					/>
				</>
			)}
			{authToken && state === 'selecting-description' && (
				<>
					<Text>Input the new Environment Description.</Text>
					<TextInput
						onSubmit={description => {
							setEnvToDescription(description);
						}}
						placeholder={'Enter description here...'}
					/>
				</>
			)}

			{state === 'done' && <Text>Environment copied successfully</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

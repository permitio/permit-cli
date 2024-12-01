import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import { option } from 'pastel';
import { TextInput } from '@inkjs/ui';
import { TokenType, tokenType } from '../../lib/auth.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import SelectInput from 'ink-select-input';

export const options = zod.object({
	key: zod.string().describe(
		option({
			description:
				'API Key to be used for the environment copying (should be least an project level key)',
		}),
	),
	existing: zod
		.boolean()
		.optional()
		.describe(
			option({
				description:
					'Provide this API Key if you want to copy to an existing account',
			}),
		),
	envName: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Name for the new environment to copy to',
			}),
		),
	envDescription: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Description for the new environment to copy to',
			}),
		),
	conflictStrategy: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Conflict Strategy to use.',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

interface EnvCopyBody {
	existingEnvId?: string | null;
	newEnvKey?: string | null;
	newEnvName?: string | null;
	newEnvDescription?: string | null;
	conflictStrategy?: string | null;
}

export default function Copy({
	options: { key: apiKey, existing, envName, envDescription, conflictStrategy },
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<
		| 'loading'
		| 'selecting-id'
		| 'selecting-name'
		| 'selecting-description'
		| 'selecting-strategy'
		| 'done'
	>('loading');
	const [projectFrom, setProjectFrom] = useState<string | null>(null);
	const [envToId, setEnvToId] = useState<string | null>(null);
	const [envToName, setEnvToName] = useState<string | undefined>(envName);
	const [envFrom, setEnvFrom] = useState<string | null>(null);
	const [envToDescription, setEnvToDescription] = useState<string | undefined>(
		envDescription,
	);
	const [envToConflictStrategy, setEnvToConflictStrategy] = useState<
		string | undefined
	>(conflictStrategy);

	const { getApiKeyScope } = useApiKeyApi();
	const { copyEnvironment } = useEnvironmentApi();

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
							key: envCopyBody.newEnvKey,
							name: envCopyBody.newEnvName,
							description: envCopyBody.newEnvDescription ?? '',
						},
					},
				};
			}
			if (envToConflictStrategy) {
				body = {
					...body,
					conflict_strategy: envCopyBody.conflictStrategy ?? 'fail',
				};
			}
			const { error } = await copyEnvironment(
				projectFrom ?? '',
				envFrom ?? '',
				apiKey,
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
			((envToName && envToDescription && envToConflictStrategy) || envToId) &&
			envFrom
		) {
			handleEnvCopy({
				newEnvKey: envToName,
				newEnvName: envToName,
				newEnvDescription: envToDescription,
				existingEnvId: envToId,
				conflictStrategy: envToConflictStrategy,
			});
		}
	}, [
		envToId,
		existing,
		envToName,
		envFrom,
		envToDescription,
		envToConflictStrategy,
	]);

	useEffect(() => {
		// Step 1, we use the API Key provided by the user &
		// checks if the api_key scope >= project_level &
		// sets the apiKey and sets the projectFrom

		const validateApiKeyScope = async () => {
			const { response: scope, error } = await getApiKeyScope(apiKey);
			if (error) setError(error);
			if (scope.environment_id) {
				setError('Please provide a Project level token or above');
				return;
			} else {
				setProjectFrom(scope.project_id);
				setAuthToken(apiKey);
			}
		};

		if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
			validateApiKeyScope();
		} else {
			setError('Invalid API Key. Please provide a valid API Key.');
			return;
		}
	}, [apiKey]);

	const handleEnvFromSelection = (
		_organisation_id: ActiveState,
		_project_id: ActiveState,
		environment_id: ActiveState,
		_secret: string,
	) => {
		setEnvFrom(environment_id.value);
		if (existing) {
			setState('selecting-id');
		} else if (!envToName) {
			setState('selecting-name');
		}
	};

	return (
		<>
			{state === 'loading' && authToken && (
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
			{authToken && state === 'selecting-id' && envFrom && (
				<>
					<Text>Input the existing EnvironmentId to copy to.</Text>
					<TextInput onSubmit={setEnvToId} placeholder={'Enter Id here...'} />
				</>
			)}
			{authToken && state === 'selecting-name' && envFrom && (
				<>
					<Text>Input the new Environment name to copy to.</Text>
					<TextInput
						onSubmit={name => {
							setEnvToName(name);
							setState('selecting-description');
						}}
						placeholder={'Enter name here...'}
					/>
				</>
			)}
			{authToken && state === 'selecting-description' && !envToDescription && (
				<>
					<Text>Input the new Environment Description.</Text>
					<TextInput
						onSubmit={description => {
							setEnvToDescription(description);
							setState('selecting-strategy');
						}}
						placeholder={'Enter description here...'}
					/>
				</>
			)}
			{authToken &&
				state === 'selecting-strategy' &&
				!envToConflictStrategy && (
					<>
						<Text>Select the conflict strategy</Text>
						<SelectInput
							onSelect={strategy => {
								setEnvToConflictStrategy(strategy.value);
							}}
							items={[
								{ label: 'fail', value: 'fail' },
								{ label: 'overwrite', value: 'overwrite' },
							]}
						/>
					</>
				)}

			{state === 'done' && <Text>Environment copied successfully</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

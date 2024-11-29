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
	scope: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Environment Id to copy from, (Defaults to the current selected environment)',
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
	scope?: string | null;
}

export default function Copy({
	options: {
		key: apiKey,
		existing,
		envName,
		envDescription,
		scope,
		conflictStrategy,
	},
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<'loading' | 'selecting' | 'done'>(
		'loading',
	);
	const [projectFrom, setProjectFrom] = useState<string | null>(null);
	const [envTo, setEnvTo] = useState<string | null>(null);
	const [envFrom, setEnvFrom] = useState<string | null>(null);

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
			if (conflictStrategy) {
				body = {
					...body,
					conflict_strategy: envCopyBody.conflictStrategy ?? '',
				};
			}
			if (scope) {
				body = {
					...body,
					scope: envCopyBody.scope ?? '',
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

		if ((envName || envTo) && envFrom) {
			handleEnvCopy({
				newEnvKey: envName,
				newEnvName: envName,
				newEnvDescription: envDescription,
				existingEnvId: envTo,
				scope: scope,
				conflictStrategy: conflictStrategy,
			});
		}
	}, [envTo, existing, envName, envFrom]);

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
		setState('selecting');
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
			{authToken &&
				state === 'selecting' &&
				existing &&
				!envTo &&
				!envName &&
				envFrom && (
					<>
						<Text>Input the existing EnvironmentId to copy to.</Text>
						<TextInput onSubmit={setEnvTo} placeholder={'Enter Id here...'} />
					</>
				)}
			{state === 'done' && <Text>Environment copied successfully</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

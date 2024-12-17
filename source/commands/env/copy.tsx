import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import { option } from 'pastel';
import { TextInput } from '@inkjs/ui';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import { cleanKey } from '../../lib/env/copy/utils.js';
import i18next from 'i18next';


export const options = zod.object({
	key: zod.string().describe(
		option({
			description:i18next.t('copy.apiKeyDescription'),
		}),
	),
	from: zod
		.string()
		.optional()
		.describe(
			option({
				description:i18next.t('copy.fromDescription'),
			}),
		),
	name: zod
		.string()
		.optional()
		.describe(
			option({
				description:i18next.t('copy.nameDescription'),
			}),
		),
	description: zod
		.string()
		.optional()
		.describe(
			option({
				description:i18next.t('copy.descriptionDescription'),
			}),
		),
	to: zod
		.string()
		.optional()
		.describe(
			option({
				description:i18next.t('copy.toDescription'),
			}),
		),
	conflictStrategy: zod
		.enum(['fail', 'overwrite'])
		.default('fail')
		.optional()
		.describe(
			option({
				description:i18next.t('copy.conflictStrategyDescription'),
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
	options: {
		key: apiKey,
		from,
		to: envToId,
		name,
		description,
		conflictStrategy,
	},
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

	const { validateApiKeyScope } = useApiKeyApi();
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
			((envToName && envToDescription && conflictStrategy) || envToId) &&
			envFrom &&
			projectFrom
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
		apiKey,
		conflictStrategy,
		copyEnvironment,
		envFrom,
		envToDescription,
		envToId,
		envToName,
		projectFrom,
	]);

	useEffect(() => {
		// Step 1, we use the API Key provided by the user &
		// checks if the api_key scope >= project_level &
		// sets the apiKey and sets the projectFrom

		(async () => {
			const { valid, scope, error } = await validateApiKeyScope(
				apiKey,
				'project',
			);
			if (!valid || error) {
				setError(error);
				return;
			} else if (scope && valid) {
				setProjectFrom(scope.project_id);
				setAuthToken(apiKey);
			}
		})();
	}, [apiKey, validateApiKeyScope]);

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

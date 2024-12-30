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
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('env.copy');

export const options = zod.object({
	key: zod.string().describe(
		option({
			description:
				'API Key to be used for the environment copying (should be at least a project level key)',
		}),
	),
	from: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Set the environment ID to copy from. In case not set, the CLI lets you select one.',
			}),
		),
	name: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: The environment name to copy to. In case not set, the CLI will ask you for one.',
			}),
		),
	description: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: The new environment description. In case not set, the CLI will ask you for it.',
			}),
		),
	to: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					"Optional: Copy the environment to an existing environment. In case this variable is set, the 'name' and 'description' variables will be ignored.",
			}),
		),
	conflictStrategy: zod
		.enum(['fail', 'overwrite'])
		.default('fail')
		.optional()
		.describe(
			option({
				description:
					"Optional: Set the environment conflict strategy. In case not set, will use 'fail'.",
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
					<Text>{i18n('select.message')}</Text>
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
					<Text>{i18n('inputName.message')}</Text>
					<TextInput
						onSubmit={name => {
							setEnvToName(name);
						}}
						placeholder={i18n('inputName.placeholder')}
					/>
				</>
			)}
			{authToken && state === 'selecting-description' && (
				<>
					<Text>{i18n('inputDescription.message')}</Text>
					<TextInput
						onSubmit={description => {
							setEnvToDescription(description);
						}}
						placeholder={i18n('inputDescription.placeholder')}
					/>
				</>
			)}

			{state === 'done' && <Text>{i18n('copiedSuccess.message')}</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

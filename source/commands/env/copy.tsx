import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';

import { loadAuthToken, TokenType, tokenType } from '../../lib/auth.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import { Form, FormProps } from 'ink-form';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';


export const options = zod.object({
	key: zod
		.string()
		.describe(
			option({
				description:
					'API Key to be used for the environment copying (should be least an project level key)',
			}),
		),
	envId: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Pass this if you want to copy to an existing environment',
			}),
		),
	envKey: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Key for the new environment to copy to',
			}),
		),
	envName: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Name for the new environment to copy to',
			}),
		),
	envDescription: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Description for the new environment to copy to',
			}),
		),
	originEnv: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Environment Id to copy from, (Defaults to the current selected environment)',
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
				description:
					'Environment Id to copy from, (Defaults to the current selected environment)',
			}),
		),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Copy({
															 options: {
																 key: apiKey,
																 originEnv,
																 envId,
																 envKey,
																 envName,
																 envDescription,
																 scope,
																 conflictStrategy,
															 },
														 }: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<'loading' | 'selecting' | 'done'>('loading');
	const [envFrom, setEnvFrom] = useState<string | null>(null);
	const [projectFrom, setProjectFrom] = useState<string | null>(null);
	// const [envTo, setEnvTo] = useState<string | null>(null);

	const { getApiKeyScope } = useApiKeyApi();
	const { copyEnvironment } = useEnvironmentApi();

	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		if (envFrom && projectFrom && authToken) {
			if ((envId) || (envKey && envName)) {
				handleEnvCopy({
					newEnvKey: envKey,
					newEnvName: envName,
					newEnvDescription: envDescription,
					existingEnvId: envId,
					scope: scope,
					conflictStrategy: conflictStrategy,
				});
			} else {
				setState('selecting');
			}
		}
	}, [envFrom, projectFrom, authToken]);

	useEffect(() => {
		// Step 2, we check if the user has provided an envId, otherwise we use the
		// currently active envId from the login or select env.
		if (originEnv) {
			setEnvFrom(originEnv);
		} else {
			loadAuthToken().then(token => {
				getApiKeyScope(token).then(({ response: scope, error }) => {
					if (error) {
						setError(`Error while trying to get saved environment scope: ${error}`);
						return;
					}
					setEnvFrom(scope.environment_id);
				});
			}).catch(err => {
				setError(`Error while getting saved environment: ${err}`);
				return;
			});
		}
	}, [originEnv]);

	useEffect(() => {
		// Step 1, we use the API Key provided by the user &
		// checks if the api_key scope >= project_level &
		// sets the apiKey and sets the projectFrom
		if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
			getApiKeyScope(apiKey).then(({ response: scope, error }) => {
				if (error) setError(error);
				if (scope.environment_id) {
					setError('Please provide a Project level token or above');
					return;
				} else {
					setProjectFrom(scope.project_id);
					setAuthToken(apiKey);
				}
			});
		} else {
			setError('Invalid API Key. Please provide a valid API Key.');
			return;
		}
	}, [apiKey]);

	const conflictStrategyOptions =
		[
			{ label: 'fail', value: 'fail' },
			{ label: 'overwrite', value: 'overwrite' },

		];

	const form: FormProps = {
		value: { 'existingEnvId': '' },
		form: {
			title: 'Please fill either of the forms, Fill [1] if you want to copy to an Existing Environment, else Fill [2] & fill [3] to specify some optional params',
			sections: [
				{
					title: 'Copy to Existing Environment',
					fields: [
						{ type: 'string', name: 'existingEnvId', label: 'ID of the existing Environment' },
					],
				},
				{
					title: 'Copy to an new Environment',
					fields: [
						{ type: 'string', name: 'newEnvKey', label: 'Key for the new Environment (required)' },
						{ type: 'string', name: 'newEnvName', label: 'Name for the new Environment (required)' },
						{ type: 'string', name: 'newEnvDescription', label: 'Description for the new Environment' },
					],
				},
				{
					title: '', fields: [
						{ type: 'string', name: 'scope', label: 'Scope' },
						{ type: 'select', name: 'conflictStrategy', label: 'Conflict Strategy', options: conflictStrategyOptions },
					],
				},
			],
		},
	};

	function handleEnvCopy(result: any) {
		let body = {};
		if (result.existingEnvId) {
			body = {
				target_env: { existing: result.existingEnvId },
			};
		} else if (result.newEnvKey && result.newEnvName) {
			body = {
				target_env: {
					new: {
						key: result.newEnvKey,
						name: result.newEnvName,
						description: result.newEnvDescription,
					},
				},
			};
		} else {
			setError('Please provide either' +
				'a. ID of an existing environment to copy to <br>' +
				'b. Key and name for the new environment to copy to <br>');

			return;
		}
		body = { ...body, conflict_strategy: result.conflictStartegy, scope: result.scope };
		copyEnvironment(projectFrom ?? '', envFrom ?? '', apiKey, null, JSON.stringify(body))
			.then(({ error }) => {
				if (error) {
					setError(`Error while copying Environment: ${error}`);
					return;
				}
				// console.log(response);
				setState('done');
			});
	}

	return (

		<>
			{state === 'loading' &&
				<Text>
					<Spinner type={'dots'} />Loading your environment
				</Text>

			}
			{authToken && projectFrom && envFrom && state === 'selecting' &&
				<Form
					{...form}
					onSubmit={handleEnvCopy}
				/>
			}
			{
				state === 'done' &&
				<Text>Environment copied successfully</Text>
			}
			{error &&
				<Text>{error}</Text>
			}
		</>

	);
}

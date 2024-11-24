import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';

import { TokenType, tokenType } from '../../lib/auth.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { ApiKeyScope, useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import { Form, FormProps } from 'ink-form';
import { useMemberApi } from '../../hooks/useMemberApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';

export const options = zod.object({
	key: zod.string().describe(
		option({
			description:
				'(Optional) API Key to be used for the environment selection',
		}),
	),
});

type Props = {
	readonly options: zInfer<typeof options>;
};

export default function Member({ options: { key: apiKey } }: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [state, setState] = useState<'loading' | 'selecting' | 'done'>(
		'loading',
	);
	const [keyScope, setKeyScope] = useState<ApiKeyScope | null>(null);

	const { getApiKeyScope } = useApiKeyApi();
	const { inviteNewMember } = useMemberApi();

	const rolesOptions = [
		{ label: 'Owner', value: 'admin' },
		{ label: 'Editor', value: 'write' },
		{
			label: 'Viewer',
			value: 'read',
		},
	];

	const form: FormProps = {
		form: {
			title: 'Invite a user to your environment',
			sections: [
				{
					title: 'Member Email',
					fields: [
						{
							type: 'string',
							name: 'memberEmail',
							label: 'Email of the member to invite',
							required: true,
						},
						{
							type: 'select',
							name: 'memberRole',
							label: 'Select Role',
							options: rolesOptions,
							required: true,
						},
					],
				},
			],
		},
	};

	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		if (apiKey && tokenType(apiKey) === TokenType.APIToken) {
			(async () => {
				const { response: scope, error } = await getApiKeyScope(apiKey);
				if (error) {
					setError(error);
					return;
				}
				if (scope.environment_id) {
					setError('Please provide a Project level token or above');
					return;
				} else {
					setKeyScope(scope);
				}
			})();
		} else {
			setError('Invalid API Key. Please provide a valid API Key.');
			return;
		}
		setState('selecting');
	}, [apiKey]);

	const handleMemberInvite = (result: any) => {
		const requestBody = {
			email: result.memberEmail,
			permissions: [
				{
					...keyScope,
					object_type: 'env',
					access_level: result.memberRole,
				},
			],
		};

		(async () => {
			const { error } = await inviteNewMember(apiKey ?? '', requestBody);
			if (error) {
				setError(error);
				return;
			}
			setState('done');
		})();
	};

	const onEnvironmentSelectSuccess = (
		_organisation: ActiveState,
		_project: ActiveState,
		environment: ActiveState,
		_secret: string,
	) => {
		if (keyScope) {
			setKeyScope({ ...keyScope, environment_id: environment.value });
		}
	};

	return (
		<>
			{state === 'loading' && (
				<Text>
					<Spinner type={'dots'} />
					Loading your environment
				</Text>
			)}
			{apiKey && state === 'selecting' && (
				<EnvironmentSelection
					accessToken={apiKey}
					cookie={''}
					onComplete={onEnvironmentSelectSuccess}
					onError={setError}
				/>
			)}
			{apiKey && state === 'selecting' && keyScope?.environment_id && (
				<Form {...form} onSubmit={handleMemberInvite} />
			)}
			{state === 'done' && <Text>User Invited Successfully !</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

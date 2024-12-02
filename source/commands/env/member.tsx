import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';
import { TextInput } from '@inkjs/ui';

import { TokenType, tokenType } from '../../lib/auth.js';
import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { ApiKeyScope, useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import SelectInput from 'ink-select-input';
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

interface MemberInviteResult {
	memberEmail: string;
	memberRole: string;
}

export default function Member({ options: { key: apiKey } }: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [state, setState] = useState<
		'loading' | 'selecting' | 'input-email' | 'input-role' | 'done'
	>('loading');
	const [keyScope, setKeyScope] = useState<ApiKeyScope | null>(null);
	const [email, setEmail] = useState<string | null>(null);

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

	const handleMemberInvite = async (memberInvite: MemberInviteResult) => {
		const requestBody = {
			email: memberInvite.memberEmail,
			permissions: [
				{
					...keyScope,
					object_type: 'env',
					access_level: memberInvite.memberRole,
				},
			],
		};

		const { error } = await inviteNewMember(apiKey ?? '', requestBody);
		if (error) {
			setError(error);
			return;
		}
		setState('done');
	};

	const onEnvironmentSelectSuccess = (
		_organisation: ActiveState,
		_project: ActiveState,
		environment: ActiveState,
	) => {
		if (keyScope && keyScope.environment_id !== environment.value) {
			setKeyScope({ ...keyScope, environment_id: environment.value });
			setState('input-email');
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
			{apiKey && state === 'input-email' && keyScope?.environment_id && (
				<>
					<Text>User EmailId: </Text>
					<TextInput
						placeholder="Enter User Email"
						onSubmit={email_input => {
							setEmail(email_input);
							setState('input-role');
						}}
					/>
				</>
			)}
			{apiKey && state === 'input-role' && keyScope?.environment_id && (
				<>
					<Text>Select a scope</Text>
					<SelectInput
						items={rolesOptions}
						onSelect={role =>
							handleMemberInvite({
								memberEmail: email ?? '',
								memberRole: role.value,
							})
						}
					/>
				</>
			)}
			{state === 'done' && <Text>User Invited Successfully !</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { TextInput } from '@inkjs/ui';

import { ApiKeyScope } from '../../hooks/useApiKeyApi.js';
import SelectInput from 'ink-select-input';
import { useMemberApi } from '../../hooks/useMemberApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import { useAuth } from '../AuthProvider.js';

const rolesOptions = [
	{ label: 'Owner', value: 'admin' },
	{ label: 'Editor', value: 'write' },
	{
		label: 'Viewer',
		value: 'read',
	},
];

type Props = {
	environment?: string;
	project?: string;
	email?: string;
	role?: 'admin' | 'write' | 'read';
};

interface MemberInviteResult {
	memberEmail: string;
	memberRole: string;
}

export default function MemberComponent({
	environment,
	project,
	email: emailP,
	role: roleP,
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [state, setState] = useState<
		'loading' | 'selecting' | 'input-email' | 'input-role' | 'inviting' | 'done'
	>('loading');
	const [keyScope, setKeyScope] = useState<ApiKeyScope>({
		environment_id: environment ?? null,
		organization_id: '',
		project_id: project ?? null,
	});
	const [email, setEmail] = useState<string | undefined>(emailP);
	const [role, setRole] = useState<string | undefined>(roleP);
	const [apiKey, setApiKey] = useState<string | null>(null);

	const { inviteNewMember } = useMemberApi();

	useEffect(() => {
		// console.log(error, state);
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	const auth = useAuth();

	useEffect(() => {
		if (auth.error) {
			setError(auth.error);
		}
		if (!auth.loading) {
			setApiKey(auth.authToken);

			if (auth.scope && environment) {
				if (!auth.scope.project_id && !project) {
					setError(
						'Please pass the project key, or use a project level Api Key',
					);
				}
				setKeyScope(prev => ({
					...prev,
					organization_id: auth.scope.organization_id,
					project_id: auth.scope.project_id ?? project ?? null,
				}));
			}
		}
	}, [auth, environment, project]);

	const handleMemberInvite = useCallback(
		async (memberInvite: MemberInviteResult) => {
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
			console.log(requestBody, apiKey);

			const { error } = await inviteNewMember(apiKey ?? '', requestBody);
			if (error) {
				setError(error);
				return;
			}
			setState('done');
		},
		[apiKey, inviteNewMember, keyScope],
	);

	const onEnvironmentSelectSuccess = useCallback(
		(
			organisation: ActiveState,
			project: ActiveState,
			environment: ActiveState,
		) => {
			// console.log(environment);
			if (keyScope && keyScope.environment_id !== environment.value) {
				setKeyScope({
					organization_id: organisation.value,
					project_id: project.value,
					environment_id: environment.value,
				});
			}
		},
		[keyScope],
	);

	useEffect(() => {
		// console.log({ email, environment, handleMemberInvite, keyScope, role });
		if (!apiKey) return;
		if (!environment && !keyScope?.environment_id) {
			setState('selecting');
		} else if (!email) {
			setState('input-email');
		} else if (!role) {
			setState('input-role');
		} else if (keyScope && keyScope.environment_id && email && role) {
			setState('inviting');
			handleMemberInvite({
				memberEmail: email,
				memberRole: role,
			});
		}
	}, [apiKey, email, environment, handleMemberInvite, keyScope, role]);

	return (
		<>
			{state === 'loading' && (
				<Text>
					<Spinner type={'dots'} />
					Loading your environment
				</Text>
			)}
			{apiKey && state === 'selecting' && (
				<>
					<Text>Select Environment to add member to</Text>
					<EnvironmentSelection
						accessToken={apiKey}
						onComplete={onEnvironmentSelectSuccess}
						onError={setError}
					/>
				</>
			)}
			{apiKey && state === 'input-email' && (
				<>
					<Text>User email: </Text>
					<TextInput
						placeholder="Enter email address for the user to invite"
						onSubmit={email_input => {
							setEmail(email_input);
						}}
					/>
				</>
			)}
			{apiKey && state === 'input-role' && (
				<>
					<Text>Select a scope</Text>
					<SelectInput
						items={rolesOptions}
						onSelect={role => {
							setRole(role.value);
						}}
					/>
				</>
			)}
			{state === 'done' && <Text>User Invited Successfully !</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

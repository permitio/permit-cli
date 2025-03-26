import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { TextInput } from '@inkjs/ui';

import { ApiKeyScope } from '../../hooks/useApiKeyApi.js';
import SelectInput from 'ink-select-input';
import { OrgMemberCreate, useMemberApi } from '../../hooks/useMemberApi.js';
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
	inviter_name?: string;
	inviter_email?: string;
};

interface MemberInviteResult {
	memberEmail: string;
	memberRole: 'admin' | 'write' | 'read' | 'no_access';
}

export default function MemberComponent({
	environment,
	project,
	email: emailP,
	role: roleP,
	inviter_email,
	inviter_name,
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [state, setState] = useState<
		| 'loading'
		| 'selecting'
		| 'input-email'
		| 'input-role'
		| 'input-inviter-name'
		| 'input-inviter-email'
		| 'inviting'
		| 'done'
	>('loading');
	const [keyScope, setKeyScope] = useState<ApiKeyScope>({
		environment_id: environment,
		organization_id: '',
		project_id: project,
	});
	const [email, setEmail] = useState<string | undefined>(emailP);
	const [role, setRole] = useState<string | undefined>(roleP);
	const [inviterName, setInviterName] = useState<string | undefined>(
		inviter_name,
	);
	const [inviterEmail, setInviterEmail] = useState<string | undefined>(
		inviter_email,
	);
	const [apiKey, setApiKey] = useState<string | null>(null);

	const { inviteNewMember } = useMemberApi();
	const auth = useAuth();

	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

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
					project_id: auth.scope.project_id ?? project,
				}));
			}
		}
	}, [auth, environment, project]);

	const handleMemberInvite = useCallback(
		async (memberInvite: MemberInviteResult) => {
			const requestBody: OrgMemberCreate = {
				email: memberInvite.memberEmail,
				permissions: [
					{
						...keyScope,
						object_type: 'env',
						access_level: memberInvite.memberRole,
					},
				],
			};

			const { error } = await inviteNewMember(
				requestBody,
				inviter_name ?? '',
				inviter_email ?? '',
			);
			if (error) {
				setError(error.toString());
				return;
			}
			setState('done');
		},
		[inviteNewMember, inviter_email, inviter_name, keyScope],
	);

	const onEnvironmentSelectSuccess = useCallback(
		(
			organisation: ActiveState,
			project: ActiveState,
			environment: ActiveState,
		) => {
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
		if (!apiKey) return;
		if (!environment && !keyScope?.environment_id) {
			setState('selecting');
		} else if (!email) {
			setState('input-email');
		} else if (!role) {
			setState('input-role');
		} else if (!inviterName) {
			setState('input-inviter-name');
		} else if (!inviterEmail) {
			setState('input-inviter-email');
		} else if (keyScope && keyScope.environment_id && email && role) {
			setState('inviting');
			handleMemberInvite({
				memberEmail: email,
				memberRole: role as 'admin' | 'write' | 'read' | 'no_access',
			});
		}
	}, [
		apiKey,
		email,
		environment,
		handleMemberInvite,
		inviterEmail,
		inviterName,
		keyScope,
		role,
	]);

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
			{apiKey && state === 'input-inviter-name' && (
				<>
					<Text>Your name: </Text>
					<TextInput
						placeholder="Enter your name"
						onSubmit={name_input => {
							setInviterName(name_input);
						}}
					/>
				</>
			)}
			{apiKey && state === 'input-inviter-email' && (
				<>
					<Text>Your email: </Text>
					<TextInput
						placeholder="Enter your email address"
						onSubmit={email_input => {
							setInviterEmail(email_input);
						}}
					/>
				</>
			)}
			{state === 'done' && <Text>User Invited Successfully !</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

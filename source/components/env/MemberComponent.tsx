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
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('env.member');

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
	memberRole: string;
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
		environment_id: environment ?? null,
		organization_id: '',
		project_id: project ?? null,
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

	useEffect(() => {
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
					setError(i18n('invalidKey.message'));
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

			const { error } = await inviteNewMember(
				apiKey ?? '',
				requestBody,
				inviter_name ?? '',
				inviter_email ?? '',
			);
			if (error) {
				setError(error);
				return;
			}
			setState('done');
		},
		[apiKey, inviteNewMember, inviter_email, inviter_name, keyScope],
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
				memberRole: role,
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
					{i18n('loading.message')}
				</Text>
			)}
			{apiKey && state === 'selecting' && (
				<>
					<Text>{i18n('selectEnv.message')}</Text>
					<EnvironmentSelection
						accessToken={apiKey}
						onComplete={onEnvironmentSelectSuccess}
						onError={setError}
					/>
				</>
			)}
			{apiKey && state === 'input-email' && (
				<>
					<Text>{i18n('enterEmail.header')}</Text>
					<TextInput
						placeholder={i18n('enterEmail.placeholder')}
						onSubmit={email_input => {
							setEmail(email_input);
						}}
					/>
				</>
			)}
			{apiKey && state === 'input-role' && (
				<>
					<Text>{i18n('selectScope.message')}</Text>
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
					<Text>{i18n('enterName.header')}</Text>
					<TextInput
						placeholder={i18n('enterName.placeholder')}
						onSubmit={name_input => {
							setInviterName(name_input);
						}}
					/>
				</>
			)}
			{apiKey && state === 'input-inviter-email' && (
				<>
					<Text>{i18n('enterYourEmail.header')}</Text>
					<TextInput
						placeholder={i18n('enterYourEmail.placeholder')}
						onSubmit={email_input => {
							setInviterEmail(email_input);
						}}
					/>
				</>
			)}
			{state === 'done' && <Text>{i18n('inviteSuccess.message')}</Text>}
			{error && <Text>{error}</Text>}
		</>
	);
}

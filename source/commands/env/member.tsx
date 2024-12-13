import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { option } from 'pastel';
import { TextInput } from '@inkjs/ui';

import zod from 'zod';
import { type infer as zInfer } from 'zod';
import { ApiKeyScope, useApiKeyApi } from '../../hooks/useApiKeyApi.js';
import SelectInput from 'ink-select-input';
import { useMemberApi } from '../../hooks/useMemberApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';

const rolesOptions = [
	{ label: 'Owner', value: 'admin' },
	{ label: 'Editor', value: 'write' },
	{
		label: 'Viewer',
		value: 'read',
	},
];

export const options = zod.object({
	key: zod.string().describe(
		option({
			description:
				'An API key to perform the invite. A project or organization level API key is required to invite members to the account.',
		}),
	),
	environment: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Id of the environment you want to add a member to. In case not set, the CLI will prompt you to select one.',
			}),
		),
	project: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'Optional: Id of the project you want to add a member.',
			}),
		),
	email: zod
		.string()
		.optional()
		.describe(
			option({
				description:
					'Optional: Email of the user you want to invite. In case not set, the CLI will ask you for it',
			}),
		),
	role: zod
		.enum(rolesOptions.map(role => role.value) as [string, ...string[]])
		.optional()
		.describe(
			option({
				description: 'Optional: Role of the user',
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

export default function Member({
	options: { key, environment, project, email: emailP, role: roleP },
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

	const { validateApiKeyScope } = useApiKeyApi();
	const { inviteNewMember } = useMemberApi();

	useEffect(() => {
		// console.log(error, state);
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		(async () => {
			const { valid, scope, error } = await validateApiKeyScope(key, 'project');
			// console.log({ valid, scope, error });
			if (error || !valid) {
				setError(error);
				return;
			} else if (valid && scope) {
				setApiKey(key);
			}

			if (valid && scope && environment) {
				if (!scope.project_id && !project) {
					setError(
						'Please pass the project key, or use a project level Api Key',
					);
				}
				setKeyScope(prev => ({
					...prev,
					organization_id: scope.organization_id,
					project_id: scope.project_id ?? project ?? null,
				}));
			}
		})();
	}, [environment, key, project, validateApiKeyScope]);

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

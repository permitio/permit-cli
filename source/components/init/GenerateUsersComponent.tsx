import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGeneratePolicyRBACSnapshot } from '../test/hooks/usePolicyRBACSnapshot.js';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';

type Props = {
	onComplete: ({
		userId,
		firstName,
		lastName,
		email,
		users,
	}: {
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
		users: string[];
	}) => void;
	onError: (error: string) => void;
};

export default function GeneratedUsersComponent({
	onComplete,
	onError,
}: Props) {
	const hasCompletedRef = useRef(false);
	const [showContinue, setShowContinue] = useState<boolean>(false);

	const snapshotOptions = useMemo(
		() => ({
			dryRun: false,
			models: ['RBAC'],
			isTestTenant: false,
		}),
		[],
	);

	const { state, error, createdUsers, tenantId } =
		useGeneratePolicyRBACSnapshot(snapshotOptions);

	// Handle errors
	useEffect(() => {
		if (error && !hasCompletedRef.current) {
			hasCompletedRef.current = true; // Mark as completed to prevent multiple calls
			onError(error);
		}
	}, [error, onError]);

	// When users are generated, show the continue option
	useEffect(() => {
		if (state === 'done' && createdUsers && createdUsers.length > 0) {
			setShowContinue(true);
		}
	}, [state, createdUsers]);

	// Handle user selection and completion
	const handleContinue = () => {
		if (
			!hasCompletedRef.current &&
			createdUsers &&
			createdUsers.length > 0 &&
			createdUsers[0]
		) {
			hasCompletedRef.current = true;

			const user = createdUsers[0];
			onComplete({
				userId: user.key || 'default-user',
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: user.email || undefined,
				users: createdUsers.map(user => user.key),
			});
		}
	};

	// Generate formatted user list for display
	const formatUserInfo = (user: {
		key: string;
		email: string;
		firstName: string;
		lastName: string;
		roles: string[];
	}) => {
		const name = [user.firstName, user.lastName].filter(Boolean).join(' ');

		return `${user.key}${name ? ` (${name})` : ''}${
			user.email ? ` - ${user.email}` : ''
		}`;
	};

	if (state !== 'done') {
		return (
			<Box>
				<Text>
					Generating users... <Spinner type="dots" />
				</Text>
			</Box>
		);
	}

	// Layout for users generated
	return (
		<Box flexDirection="column">
			<Text>
				Generated {createdUsers?.length || 0} users in Tenant {tenantId}:
			</Text>

			<Box flexDirection="column" marginTop={1} marginBottom={1}>
				{createdUsers && createdUsers.length > 0 ? (
					createdUsers.map((user, i) => (
						<Text key={i}>
							{i + 1}. {formatUserInfo(user)} {i === 0 ? '(primary)' : ''}
						</Text>
					))
				) : (
					<Text>No users generated</Text>
				)}
			</Box>

			{showContinue && (
				<Box flexDirection="column" marginTop={1}>
					<Text>Press Enter to continue </Text>
					<SelectInput
						items={[
							{
								label: 'Continue',
								value: 'continue',
							},
						]}
						onSelect={() => handleContinue()}
					/>
				</Box>
			)}
		</Box>
	);
}

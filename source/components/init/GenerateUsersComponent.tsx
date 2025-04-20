import React, { useEffect, useRef, useMemo } from 'react';
import { useGeneratePolicySnapshot } from '../test/hooks/usePolicySnapshot.js';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

type Props = {
	onComplete: ({
		userId,
		firstName,
		lastName,
		email,
	}: {
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	}) => void;
	onError: (error: string) => void;
};

export default function GeneratedUsersComponent({
	onComplete,
	onError,
}: Props) {
	const hasCompletedRef = useRef(false);

	const snapshotOptions = useMemo(
		() => ({
			dryRun: true,
			models: ['RBAC'],
		}),
		[],
	);

	const { state, error, dryUsers } = useGeneratePolicySnapshot(snapshotOptions);

	// Handle errors
	useEffect(() => {
		if (error && !hasCompletedRef.current) {
			hasCompletedRef.current = true; // Mark as completed to prevent multiple calls
			onError(error);
		}
	}, [error, onError]);

	useEffect(() => {
		if (
			state === 'done' &&
			!hasCompletedRef.current &&
			dryUsers &&
			dryUsers.length > 0
		) {
			// Mark as completed BEFORE taking any action
			hasCompletedRef.current = true;

			// Use setTimeout to break the current render cycle
			setTimeout(() => {
				const user = dryUsers[0];
				if (user)
					onComplete({
						userId: user.key || 'default-user',
						firstName: user.firstName || undefined,
						lastName: user.lastName || undefined,
						email: user.email || undefined,
					});
			}, 0);
		}
	}, [state, dryUsers, onComplete]);

	return (
		<Box>
			{state !== 'done' ? (
				<Text>
					Generating users... <Spinner type="dots" />
				</Text>
			) : (
				<Text>Generated {dryUsers?.length || 0} users</Text>
			)}
		</Box>
	);
}

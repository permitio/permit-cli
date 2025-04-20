import React, { useEffect } from 'react';
import { useGeneratePolicySnapshot } from '../test/hooks/usePolicySnapshot.js';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
type Props = {
	onComplete: ({
		userId,
		firstName,
		lastName,
		email,
	}: {
		userId: string;
		firstName: string;
		lastName: string;
		email: string;
	}) => void;
	onError: (error: string) => void;
};

export default function GeneratedUsersComponent({
	onComplete,
	onError,
}: Props) {
	const { state, error, dryUsers } = useGeneratePolicySnapshot({
		dryRun: false,
		models: ['RBAC'],
	});
	useEffect(() => {
		if (error) onError(error);
	}, [error, onError]);

	useEffect(() => {
		if (state === 'done' && dryUsers.length > 0 && dryUsers[0]) {
			onComplete({
				userId: dryUsers[0].key,
				firstName: dryUsers[0].firstName,
				lastName: dryUsers[0].lastName,
				email: dryUsers[0].email,
			});
		}
	}, [state, dryUsers, onComplete]);

	return (
		<>
			{state !== 'done' && (
				<Text>
					Generating users... <Spinner type="dots" />
				</Text>
			)}
		</>
	);
}

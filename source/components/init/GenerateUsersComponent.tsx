import React, { useEffect } from 'react';
import { useGeneratePolicySnapshot } from '../test/hooks/usePolicySnapshot.js';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
type Props = {
	onComplete: () => void;
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
		if (state === 'done' && dryUsers) {
			onComplete();
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

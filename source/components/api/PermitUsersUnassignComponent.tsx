import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { type infer as zInfer } from 'zod';
import { options } from '../../commands/api/users/unassign.js';
import { useAuth } from '../AuthProvider.js';
import Spinner from 'ink-spinner';
import { usersApi } from '../../utils/permitApi.js';

type Props = {
	options: zInfer<typeof options>;
};

export default function PermitUsersUnassignComponent({ options }: Props) {
	const auth = useAuth();
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	const [result, setResult] = useState<object>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const unassignRole = async () => {
			try {
				if (!options.userId || !options.roleKey || !options.tenantKey) {
					throw new Error(
						'User ID, role key, and tenant key are required for unassignment',
					);
				}

				const response = await usersApi.unassign({
					auth,
					projectId: options.projectId,
					envId: options.envId,
					apiKey: options.apiKey,
					userId: options.userId,
					roleKey: options.roleKey,
					tenantKey: options.tenantKey,
				});

				if (!response.success) {
					setResult(response.data || {});
					throw new Error(response.error);
				}

				setResult(response.data || {});
				setStatus('done');
			} catch (error) {
				setStatus('error');
				setErrorMessage(
					error instanceof Error ? error.message : 'Unknown error occurred',
				);
			}
		};

		unassignRole();
	}, [options, auth]);

	return (
		<Box flexDirection="column">
			{status === 'processing' && <Spinner type="dots" />}

			{status === 'done' && (
				<Box flexDirection="column">
					<Text color="green">✓ Operation completed successfully</Text>
					<Text>{JSON.stringify(result, null, 2)}</Text>
				</Box>
			)}

			{status === 'error' && (
				<>
					<Text color="red">✗ Error: {errorMessage} </Text>
					<Text>{JSON.stringify(result, null, 2)}</Text>
				</>
			)}
		</Box>
	);
}

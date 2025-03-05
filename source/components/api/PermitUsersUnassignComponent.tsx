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

// Handles role unassignment operations with real-time feedback
export default function PermitUsersUnassignComponent({ options }: Props) {
	const auth = useAuth();
	// Mirror assign component state management for consistency
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	const [result, setResult] = useState<object>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const unassignRole = async () => {
			try {
				// Validate required fields before making API call
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

				// Handle both success and error responses uniformly
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

	// Maintain consistent UI feedback pattern across role management operations
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

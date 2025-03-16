import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { type infer as zInfer } from 'zod';
import { options } from '../../commands/api/users/assign.js';
import { useAuth } from '../AuthProvider.js';
import Spinner from 'ink-spinner';
import { usersApi } from '../../utils/permitApi.js';

type Props = {
	options: zInfer<typeof options>;
};

// Handles role assignment operations with real-time feedback
export default function PermitUsersAssignComponent({ options }: Props) {
	const auth = useAuth();
	// Track operation state for better UX feedback
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	// Store API response for both success and error cases
	const [result, setResult] = useState<object>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const assignRole = async () => {
			try {
				// Validate required fields before making API call
				if (!options.user || !options.role || !options.tenant) {
					throw new Error(
						'User ID, role key, and tenant key are required for assignment',
					);
				}

				const response = await usersApi.assign({
					auth,
					projectId: options.projectId,
					envId: options.envId,
					apiKey: options.apiKey,
					user: options.user,
					role: options.role,
					tenant: options.tenant,
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

		assignRole();
	}, [options, auth]);

	// Provide clear visual feedback for all operation states
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

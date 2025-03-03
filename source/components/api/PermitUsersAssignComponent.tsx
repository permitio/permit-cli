import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { type infer as zInfer } from 'zod';
import { options } from '../../commands/api/users/assign.js';
import { useAuth } from '../AuthProvider.js';
import Spinner from 'ink-spinner';

type Props = {
	options: zInfer<typeof options>;
};

export default function PermitUsersAssignComponent({ options }: Props) {
	const auth = useAuth();
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	const [result, setResult] = useState<object>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const performAction = async () => {
			try {
				const baseUrl = `https://api.permit.io/v2/facts/${
					auth.scope.project_id || options.projectId
				}/${auth.scope.environment_id || options.envId}`;

				const headers = {
					Authorization: `Bearer ${auth.authToken || options.apiKey}`,
					'Content-Type': 'application/json',
				};

				if (!options.userId || !options.roleKey || !options.tenantKey) {
					throw new Error(
						'User ID, role key, and tenant key are required for assignment',
					);
				}

				const response = await fetch(`${baseUrl}/role_assignments`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						role: options.roleKey,
						tenant: options.tenantKey,
						user: options.userId,
					}),
				});

				if (!response.ok) {
					setResult(await response.json());
					throw new Error(`API request failed: ${response.statusText}`);
				}

				const data = await response.json();
				setResult(data);
				setStatus('done');
			} catch (error) {
				setStatus('error');
				setErrorMessage(
					error instanceof Error ? error.message : 'Unknown error occurred',
				);
			}
		};

		performAction();
	}, [options, auth.scope, auth.authToken]);

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

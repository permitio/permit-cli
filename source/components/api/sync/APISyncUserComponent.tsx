import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { options } from '../../../commands/api/sync/user.js';
import { type infer as zType } from 'zod';
import TextInput from 'ink-text-input';
import { Text } from 'ink';
import useClient from '../../../hooks/useClient.js';
import { UserSyncOptions, validate } from '../../../utils/api/user/utils.js';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';

type Props = {
	options: zType<typeof options>;
};

type ComponentStatus = 'Input' | 'Processing' | 'Done' | 'Error';

export default function APISyncUserComponent({ options }: Props) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const { scope } = useAuth();

	// Initialize states
	const [status, setStatus] = useState<ComponentStatus>('Processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [userId, setUserId] = useState<string>(options.userid || '');

	// Use useMemo for initial payload to avoid recreating on every render
	const initialPayload = useMemo(() => {
		let attributes = {};
		// Safely parse JSON attributes
		if (options.attributes) {
			try {
				attributes = JSON.parse(options.attributes);
			} catch (error) {
				console.error('Failed to parse attributes JSON:', error);
				// We'll handle this error in the validation step
			}
		}

		return {
			key: options.userid || '',
			email: options.email,
			firstName: options.firstName,
			lastName: options.lastName,
			attributes,
			roleAssignments: options.roleAssignments,
		};
	}, [
		options.userid,
		options.email,
		options.firstName,
		options.lastName,
		options.attributes,
		options.roleAssignments,
	]);

	const [payload, setPayload] = useState<UserSyncOptions>(initialPayload);

	// Sync user function with proper dependency tracking
	const syncUser = useCallback(async () => {
		// Already in processing status, no need to set again
		try {
			const apiClient = options.apiKey
				? unAuthenticatedApiClient(options.apiKey)
				: authenticatedApiClient();

			const { response } = await apiClient.PUT(
				'/v2/facts/{proj_id}/{env_id}/users/{user_id}',
				{
					proj_id: scope.project_id as string,
					env_id: scope.environment_id as string,
					user_id: userId,
				},
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				{
					key: payload.key,
					email: payload.email,
					first_name: payload.firstName,
					last_name: payload.lastName,
					attributes: payload.attributes as Record<string, never>, // Changed from never to unknown
					role_assignments: payload.roleAssignments,
				},
				undefined,
			);

			if (response.status === 422) {
				setErrorMessage('Validation Error: Invalid user ID');
				setStatus('Error');
			} else {
				setStatus('Done');
			}
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : String(error));
			setStatus('Error');
		}
	}, [
		options.apiKey,
		unAuthenticatedApiClient,
		authenticatedApiClient,
		scope.project_id,
		scope.environment_id,
		userId,
		payload.key,
		payload.email,
		payload.firstName,
		payload.lastName,
		payload.attributes,
		payload.roleAssignments,
	]);

	// Validation effect - runs only when necessary dependencies change
	useEffect(() => {
		// Don't do anything if we're not in processing state
		// This prevents infinite loops from state changes
		if (status !== 'Processing' && status !== 'Input') {
			return;
		}

		// If no key, go to input state
		if (!payload.key) {
			setStatus('Input');
			return;
		}

		// Otherwise validate and proceed
		const doValidate = async () => {
			try {
				// Only validate when we have a key
				if (validate(payload)) {
					// Only update userId if it changed
					if (userId !== payload.key) {
						setUserId(payload.key);
					}

					setStatus('Processing');
					await syncUser();
				} else {
					setErrorMessage('Validation Error: Invalid user ID');
					setStatus('Error');
				}
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : String(error));
				setStatus('Error');
			}
		};

		doValidate();
	}, [payload, userId, syncUser, status]); // Added payload to dependency array

	// Handle user input submission
	const handleUserIdSubmit = useCallback((value: string) => {
		if (value.trim() === '') return; // Prevent empty submission

		// Update payload with new key value
		setPayload(prev => ({
			...prev,
			key: value,
		}));

		// Move to processing state
		setStatus('Processing');
	}, []);

	return (
		<>
			{status === 'Processing' && <Spinner type="dots" />}
			{status === 'Error' && errorMessage && (
				<Text color="red">Error: {errorMessage}</Text>
			)}
			{status === 'Done' && (
				<Text color="green"> User Synced Successfully!</Text>
			)}

			{status === 'Input' && (
				<>
					<Text color="yellow">UserID is required. Please enter it:</Text>
					<TextInput
						value={userId}
						onChange={setUserId}
						onSubmit={handleUserIdSubmit}
					/>
				</>
			)}
		</>
	);
}

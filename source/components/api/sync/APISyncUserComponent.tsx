import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../../../commands/api/sync/user.js';
import TextInput from 'ink-text-input';
import { Text } from 'ink';
import useClient from '../../../hooks/useClient.js';
import { UserSyncOptions, validate } from '../../../utils/api/user/utils.js';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';

// Define a new type that extends the original options but allows roleAssignments to be an array
type ExtendedOptions = Omit<
	zType<typeof originalOptions>,
	'roleAssignments'
> & {
	roleAssignments?: string | Array<{ role: string; tenant?: string }>;
};

type Props = {
	options: ExtendedOptions;
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
	const initialPayload = useMemo<UserSyncOptions>(() => {
		let attributes = {};
		// Safely parse JSON attributes
		if (options.attributes && typeof options.attributes === 'string') {
			try {
				attributes = JSON.parse(options.attributes);
			} catch (error) {
				console.error('Failed to parse attributes JSON:', error);
				// Don't continue with invalid JSON
				setErrorMessage(
					'Failed to parse attributes JSON: ' +
						(error instanceof Error ? error.message : String(error)),
				);
				setStatus('Error');
			}
		} else if (options.attributes && typeof options.attributes === 'object') {
			// If it's already an object, use it directly
			attributes = options.attributes;
		}

		// Parse role assignments if they're still a string
		let roleAssignments: Array<{ role: string; tenant?: string }> = [];
		if (typeof options.roleAssignments === 'string') {
			try {
				const parsedAssignments = JSON.parse(options.roleAssignments);
				if (Array.isArray(parsedAssignments)) {
					roleAssignments = parsedAssignments;
				} else {
					console.error('Role assignments must be a JSON array');
					setErrorMessage('Role assignments must be a JSON array');
					setStatus('Error');
				}
			} catch (error) {
				console.error('Failed to parse role assignments JSON:', error);
				setErrorMessage(
					'Failed to parse role assignments JSON: ' +
						(error instanceof Error ? error.message : String(error)),
				);
				setStatus('Error');
			}
		} else if (Array.isArray(options.roleAssignments)) {
			// If it's already an array, use it directly
			roleAssignments = options.roleAssignments;
		}

		return {
			key: options.userid || '',
			email: options.email,
			firstName: options.firstName,
			lastName: options.lastName,
			attributes,
			roleAssignments,
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

	// Function to parse API error message from JSON

	// Sync user function with proper dependency tracking
	const syncUser = useCallback(async () => {
		try {
			const apiClient = options.apiKey
				? unAuthenticatedApiClient(options.apiKey)
				: authenticatedApiClient();

			const result = await apiClient.PUT(
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

			// Explicit check for 422 status
			if (result.response.status === 422) {
				// Try to extract detailed validation error from response
				if (result.error) {
					try {
						// Parse the error if it's a string
						const errorData =
							typeof result.error === 'string'
								? JSON.parse(result.error)
								: result.error;

						// Extract validation message
						const errorMessage =
							errorData.message || errorData.detail || 'Invalid Payload';

						// Set a more specific error message
						setErrorMessage(`Validation Error: ${errorMessage[0]['msg']}`);
					} catch (e) {
						// Fallback to generic message if parsing fails
						setErrorMessage(
							'Validation Error: Invalid Payload' +
								(e instanceof Error ? e.message : String(e)),
						);
					}
				} else {
					// No error details available
					setErrorMessage('Validation Error: Invalid Payload');
				}

				setStatus('Error');
				return;
			}

			// Check if there's an error object in the response
			if (result.error) {
				try {
					const errorObj =
						typeof result.error === 'string'
							? JSON.parse(result.error)
							: result.error;
					setErrorMessage(
						errorObj.message || `API Error: ${JSON.stringify(errorObj)}`,
					);
					setStatus('Error');
					return;
				} catch (e) {
					// If parsing fails, use the raw error
					setErrorMessage(
						`API Error: ${result.error}` +
							(e instanceof Error ? e.message : String(e)),
					);
					setStatus('Error');
					return;
				}
			}

			// Only set to Done if we got a success status (200-299) and no error
			if (result.response.status >= 200 && result.response.status < 300) {
				setStatus('Done');
			} else {
				setErrorMessage(
					`API Error: Unexpected status code ${result.response.status}`,
				);
				setStatus('Error');
			}
		} catch (error) {
			// Handle specific error objects
			if (error && typeof error === 'object' && 'error' in error) {
				const errorObj = error as { error: unknown };
				if (typeof errorObj.error === 'string') {
					try {
						// Try to parse the error JSON
						const parsedError = JSON.parse(errorObj.error);
						setErrorMessage(parsedError.message || String(errorObj.error));
					} catch {
						// If parsing fails, use the raw error
						setErrorMessage(String(errorObj.error));
					}
				} else {
					setErrorMessage(String(errorObj.error));
				}
			} else {
				// Default error handling
				setErrorMessage(error instanceof Error ? error.message : String(error));
			}

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

	// Validation effect - runs only when payload.key changes or status changes
	useEffect(() => {
		// Skip if we're already done or in error state
		if (status === 'Done' || status === 'Error') {
			return;
		}

		// If no key, go to input state
		if (!payload.key) {
			setStatus('Input');
			return;
		}

		// Only proceed with validation if we're in Processing state
		if (status === 'Processing') {
			const doValidate = async () => {
				try {
					if (validate(payload)) {
						// Only update userId if it changed
						if (userId !== payload.key) {
							setUserId(payload.key);
						}

						await syncUser();
					} else {
						setErrorMessage('Validation Error: Invalid user ID');
						setStatus('Error');
					}
				} catch (error) {
					setErrorMessage(
						error instanceof Error ? error.message : String(error),
					);
					setStatus('Error');
				}
			};

			doValidate();
		}
	}, [payload, userId, syncUser, status]);

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

	// Format error message for better readability
	const formatErrorMessage = useCallback((message: string) => {
		// Check if error mentions tenant not found
		if (message.includes("could not find 'Tenant'")) {
			// Extract tenant ID if possible
			const tenantMatch = message.match(/id='([^']+)'/);
			const tenantId = tenantMatch ? tenantMatch[1] : 'unknown';
			return `Tenant not found: '${tenantId}'. Please create this tenant before assigning roles to it.`;
		}
		return message;
	}, []);

	return (
		<>
			{status === 'Processing' && <Spinner type="dots" />}
			{status === 'Error' && errorMessage && (
				<Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>
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

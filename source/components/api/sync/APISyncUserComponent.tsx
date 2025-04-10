import React, { useEffect, useState, useCallback } from 'react';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../../../commands/api/sync/user.js';
import TextInput from 'ink-text-input';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';
import { useParseUserData } from '../../../hooks/useParseUserData.js';
import { useSyncUser } from '../../../hooks/useSyncUser.js';

// Define a new type that extends the original options
type ExtendedOptions = zType<typeof originalOptions>;

type Props = {
	options: ExtendedOptions;
};

export default function APISyncUserComponent({ options }: Props) {
	const { scope } = useAuth();

	// Parse user data using the new hook
	const { payload, parseError } = useParseUserData(options);

	// Initialize user ID state - use key from options as the userId
	const [userId, setUserId] = useState<string>(options.key || '');

	// Use the sync user hook
	const {
		status,
		errorMessage,
		syncUser,
		formatErrorMessage,
		setStatus,
		setErrorMessage,
	} = useSyncUser(scope.project_id, scope.environment_id, options.apiKey);

	// Handle parse errors
	useEffect(() => {
		if (parseError) {
			setErrorMessage(parseError);
			setStatus('error');
		}
	}, [parseError, setErrorMessage, setStatus]);

	// Validation and sync effect
	useEffect(() => {
		// Skip if we're already done or in error state
		if (status === 'done' || status === 'error') {
			return;
		}

		if (!payload.key) {
			setStatus('input');
			return;
		}
		if (status === 'processing') {
			if (userId !== payload.key) {
				setUserId(payload.key);
			}
			syncUser(userId, payload);
		}
	}, [payload, userId, syncUser, status, setStatus]);
	const handleUserIdSubmit = useCallback(
		(value: string) => {
			if (value.trim() === '') return; // Prevent empty submission

			// Update payload key and move to processing state
			setUserId(value);
			payload.key = value;
			setStatus('processing');
		},
		[setStatus, payload],
	);

	return (
		<>
			{status === 'processing' && <Spinner type="dots" />}
			{status === 'error' && errorMessage && (
				<Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>
			)}
			{status === 'done' && (
				<Text color="green"> User Synced Successfully!</Text>
			)}

			{status === 'input' && (
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

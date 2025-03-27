import React, { useEffect, useState, useCallback } from 'react';
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

export default function APISyncUserComponent({ options }: Props) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const { scope } = useAuth();

	const [status, setStatus] = useState<
		'Input' | 'Processing' | 'Done' | 'Error'
	>('Processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [userId, setUserId] = useState<string>(options.userid ?? '');
	const [payload, setPayload] = useState<UserSyncOptions>({
		key: options.userid ?? '',
		email: options.email,
		firstName: options.firstName,
		lastName: options.lastName,
		attributes: options.attributes ? JSON.parse(options.attributes) : {},
		roleAssignments: options.roleAssignments,
	});

	const syncUser = useCallback(async () => {
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
					attributes: payload.attributes as Record<string, never>,
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
		scope,
		userId,
		payload,
	]);

	useEffect(() => {
		const doValidate = async () => {
			if (!payload.key) {
				setStatus('Input');
				return;
			}
			try {
				if (validate(payload)) {
					setUserId(payload.key);
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
	}, [payload.key, payload, syncUser]);

	function handleUserIdSubmit(value: string) {
		if (value.trim() === '') return; // Prevent empty submission

		setUserId(value); // Update userId state immediately
		setPayload(prev => ({
			...prev,
			key: value,
		}));

		setStatus('Processing'); // Move to the next step
	}

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

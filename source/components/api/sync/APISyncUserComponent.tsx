import React, { useEffect, useState, useCallback } from 'react';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../../../commands/api/sync/user.js';
import TextInput from 'ink-text-input';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { useAuth } from '../../AuthProvider.js';
import { useParseUserData } from '../../../hooks/useParseUserData.js';
import { useSyncUser } from '../../../hooks/useSyncUser.js';
import { useRolesApi } from '../../../hooks/useRolesApi.js';

// Define a new type that extends the original options
type ExtendedOptions = zType<typeof originalOptions>;

type Props = {
	options: ExtendedOptions;
	onComplete?: ({
		userId,
		firstName,
		lastName,
		email,
		roles,
	}: {
		userId: string;
		firstName?: string;
		lastName?: string;
		email?: string;
		roles?: string[];
	}) => void;
	onError?: (error: string) => void;
};

type ComponentState =
	| 'input'
	| 'roleSelection'
	| 'processing'
	| 'done'
	| 'error'
	| 'waitingForConfirmation';

export default function APISyncUserComponent({
	options,
	onComplete,
	onError,
}: Props) {
	const { scope } = useAuth();

	// Parse user data using the hook
	const { payload, parseError } = useParseUserData(options);

	// Initialize user ID state - use key from options as the userId
	const [userId, setUserId] = useState<string>(options.key || '');

	// Flag to track if the user ID is submitted
	const [userIdSubmitted, setUserIdSubmitted] = useState<boolean>(
		!!options.key,
	);

	// Component state to track workflow
	const [componentState, setComponentState] = useState<ComponentState>(
		options.key ? 'roleSelection' : 'input',
	);

	// Roles management
	const { getExistingRoles } = useRolesApi();
	const [availableRoles, setAvailableRoles] = useState<string[]>([]);
	const [selectedRole, setSelectedRole] = useState<string>('');
	const [rolesLoading, setRolesLoading] = useState<boolean>(false);

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
			setComponentState('error');
			setStatus('error');
			return;
		}

		// Only process this effect if userId is submitted (not during typing)
		if (!userIdSubmitted) {
			return;
		}

		// If userIdSubmitted and we already have role assignments, proceed to processing
		if (
			userId &&
			payload.roleAssignments &&
			payload.roleAssignments.length > 0 &&
			payload.roleAssignments[0]
		) {
			const firstRole = payload.roleAssignments[0].role;
			setSelectedRole(firstRole);
			setStatus('processing');
			setComponentState('processing');
			syncUser(userId, payload);
		}
	}, [
		parseError,
		setErrorMessage,
		setStatus,
		payload,
		syncUser,
		userId,
		userIdSubmitted,
	]);

	// Load available roles for assignment
	useEffect(() => {
		const fetchRoles = async () => {
			if (componentState === 'roleSelection') {
				try {
					setRolesLoading(true);
					const rolesSet = await getExistingRoles();
					const rolesArray = Array.from(rolesSet);

					if (rolesArray.length === 0) {
						setErrorMessage('No roles available to assign');
						setComponentState('error');
						return;
					}

					setAvailableRoles(rolesArray);
				} catch (error) {
					setErrorMessage(
						`Failed to fetch roles: ${error instanceof Error ? error.message : String(error)}`,
					);
					setComponentState('error');
				} finally {
					setRolesLoading(false);
				}
			}
		};

		fetchRoles();
	}, [componentState, getExistingRoles, setErrorMessage]);

	// Handle sync status changes
	useEffect(() => {
		if (componentState === 'processing') {
			if (status === 'done') {
				if (onComplete) {
					setComponentState('waitingForConfirmation');
				} else {
					setComponentState('done');
				}
			} else if (status === 'error' && errorMessage) {
				setComponentState('error');
			}
		}
	}, [status, errorMessage, componentState, onComplete]);

	const handleUserIdSubmit = useCallback(
		(value: string) => {
			if (value.trim() === '') return; // Prevent empty submission

			// Update payload key and mark as submitted
			setUserId(value);
			payload.key = value;
			setUserIdSubmitted(true);

			// Now move to role selection
			setComponentState('roleSelection');
		},
		[payload],
	);

	const handleRoleSelect = useCallback(
		(item: { value: string }) => {
			setSelectedRole(item.value);

			// Add role assignment to the payload
			payload.roleAssignments = [
				{
					role: item.value,
					tenant: 'default',
				},
			];

			// Now proceed with the user sync with the updated payload
			setComponentState('processing');
			setStatus('processing');
			syncUser(userId, payload);
		},
		[payload, syncUser, userId, setStatus],
	);

	// Handle continue button click from confirmation
	const handleContinue = useCallback(() => {
		if (componentState === 'waitingForConfirmation' && onComplete) {
			setComponentState('done');
			onComplete({
				userId: payload.key,
				firstName: payload.firstName,
				lastName: payload.lastName,
				email: payload.email,
				roles: selectedRole ? [selectedRole] : undefined,
			});
		}

		setComponentState('done');
	}, [componentState, onComplete, payload, selectedRole]);

	// Helper to extract roles from payload
	const getRolesToDisplay = useCallback(() => {
		if (selectedRole) {
			return [selectedRole];
		}

		if (payload.roleAssignments && payload.roleAssignments.length > 0) {
			return payload.roleAssignments.map(ra => ra.role).filter(Boolean);
		}

		return [];
	}, [selectedRole, payload.roleAssignments]);

	return (
		<>
			{componentState === 'roleSelection' && !rolesLoading && (
				<Box flexDirection="column" padding={1}>
					<Text>
						Select a role to assign to user <Text color="green">{userId}</Text>:
					</Text>

					<Box marginTop={1} flexDirection={'column'}>
						<SelectInput
							items={availableRoles.map(role => ({
								label: role,
								value: role,
							}))}
							onSelect={handleRoleSelect}
						/>
					</Box>
				</Box>
			)}

			{componentState === 'roleSelection' && rolesLoading && (
				<Box>
					<Text>
						<Spinner type="dots" /> Loading available roles...
					</Text>
				</Box>
			)}

			{componentState === 'processing' && (
				<Box>
					<Text>
						<Spinner type="dots" /> Syncing user data with role assignment...
					</Text>
				</Box>
			)}

			{componentState === 'error' && errorMessage && !onError && (
				<Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>
			)}

			{componentState === 'error' && errorMessage && onError && (
				<Box flexDirection="column">
					<Text color="red">Error: {formatErrorMessage(errorMessage)}</Text>
					<Box marginTop={1}>
						<SelectInput
							items={[
								{
									label: 'Continue',
									value: 'continue',
								},
							]}
							onSelect={() => {
								onError(errorMessage);
								setComponentState('done');
							}}
						/>
					</Box>
				</Box>
			)}

			{componentState === 'waitingForConfirmation' && (
				<Box flexDirection="column">
					<Text color="green">User Synced Successfully</Text>
					{payload.key && <Text>User Key: {payload.key}</Text>}
					{payload.firstName && <Text>Name: {payload.firstName}</Text>}
					{payload.lastName && <Text>Last Name: {payload.lastName}</Text>}
					{payload.email && <Text>Email: {payload.email}</Text>}
					{getRolesToDisplay().length > 0 && (
						<Text>
							Assigned Role(s):{' '}
							<Text color="blue">{getRolesToDisplay().join(', ')}</Text>
						</Text>
					)}
					{Object.keys(payload?.attributes || {}).length > 0 && (
						<Text>Attributes: {JSON.stringify(payload.attributes)}</Text>
					)}

					<Box marginTop={1}>
						<SelectInput
							items={[
								{
									label: 'Continue',
									value: 'continue',
								},
							]}
							onSelect={handleContinue}
						/>
					</Box>
				</Box>
			)}

			{componentState === 'done' && (
				<Box flexDirection="column">
					<Text color="green">User Synced Successfully</Text>
					{payload.key && <Text>User Key: {payload.key}</Text>}
					{payload.firstName && <Text>Name: {payload.firstName}</Text>}
					{payload.lastName && <Text>Last Name: {payload.lastName}</Text>}
					{payload.email && <Text>Email: {payload.email}</Text>}
					{getRolesToDisplay().length > 0 && (
						<Text>
							Assigned Role(s):{' '}
							<Text color="blue">{getRolesToDisplay().join(', ')}</Text>
						</Text>
					)}
					{Object.keys(payload?.attributes || {}).length > 0 && (
						<Text>Attributes: {JSON.stringify(payload.attributes)}</Text>
					)}
				</Box>
			)}

			{componentState === 'input' && (
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

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import { useAssignRoleApi, AssignRole } from '../../hooks/useAssignRoleApi.js';

// New type for user-role assignment
type UserRoleAssignment = {
	user: string;
	role: string;
};

// Helper function to convert UserRoleAssignment to the format expected by the API
const convertToRoleAssignments = (
	assignments: UserRoleAssignment[],
): AssignRole[] => {
	return assignments.map(assignment => ({
		role: assignment.role,
		tenant: 'default', // Assuming 'default' tenant - adjust if needed
		user: assignment.user,
	}));
};

type Props = {
	users: string[];
	onComplete: () => void;
	onError: (error: string) => void;
};

type StepType = 'selecting' | 'confirming' | 'processing' | 'success';

export default function AssignRoleComponent({
	users,
	onComplete,
	onError,
}: Props) {
	const { getExistingRoles, status: rolesStatus } = useRolesApi();
	const {
		assignBulkRoles,
		status: assignStatus,
		errorMessage,
	} = useAssignRoleApi();

	// State for available roles from the API
	const [availableRoles, setAvailableRoles] = useState<string[]>([]);

	// State for the current user being assigned
	const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);

	// State to store all user-role assignments
	const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);

	// State for loading while fetching roles
	const [loading, setLoading] = useState<boolean>(true);

	// Current step in the workflow
	const [currentStep, setCurrentStep] = useState<StepType>('selecting');

	// Check for errors from API
	useEffect(() => {
		if (errorMessage) {
			onError(errorMessage);
		}
	}, [errorMessage, onError]);

	// Observe API status changes
	useEffect(() => {
		if (assignStatus === 'done' && currentStep === 'processing') {
			setCurrentStep('success');
		}
	}, [assignStatus, currentStep]);

	// Fetch available roles when the component mounts
	useEffect(() => {
		const fetchRoles = async () => {
			try {
				setLoading(true);
				const rolesSet = await getExistingRoles();
				const rolesArray = Array.from(rolesSet);

				if (rolesArray.length === 0) {
					onError('No roles available to assign. Please create roles first.');
					return;
				}

				setAvailableRoles(rolesArray);
			} catch (error) {
				onError(
					`Failed to fetch roles: ${error instanceof Error ? error.message : String(error)}`,
				);
			} finally {
				setLoading(false);
			}
		};

		fetchRoles();
	}, [getExistingRoles, onError]);

	// Handle role selection for the current user
	const handleRoleSelect = (item: { value: string }) => {
		const newAssignment: UserRoleAssignment = {
			user: users[currentUserIndex] || '',
			role: item.value,
		};

		// Add this assignment to our list
		setAssignments(prev => [...prev, newAssignment]);

		// Move to the next user or show confirmation if all users are assigned
		if (currentUserIndex < users.length - 1) {
			setCurrentUserIndex(currentUserIndex + 1);
		} else {
			// All users have been assigned roles, move to confirmation
			setCurrentStep('confirming');
		}
	};

	// Handle confirmation action
	const handleConfirm = async () => {
		try {
			setCurrentStep('processing');

			// Convert to the format expected by the API
			const roleAssignments = convertToRoleAssignments(assignments);

			// Save the role assignments to the API
			await assignBulkRoles(roleAssignments);

			// Success will be handled by the useEffect watching assignStatus
		} catch (error) {
			onError(
				`Failed to assign roles: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};

	const handleContinue = () => {
		onComplete();
	};

	const handleEdit = () => {
		setAssignments([]);
		setCurrentUserIndex(0);
		setCurrentStep('selecting');
	};

	// Current user being processed
	const currentUser = users[currentUserIndex];

	// Loading indicator
	if (loading || rolesStatus === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading available roles...
				</Text>
			</Box>
		);
	}

	// Processing indicator
	if (currentStep === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Assigning roles to users...
				</Text>
			</Box>
		);
	}

	// Success screen with continue button
	if (currentStep === 'success') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="green" bold>
					✓ Role assignments completed successfully!
				</Text>

				<Box
					flexDirection="column"
					marginTop={1}
					borderStyle="single"
					paddingX={1}
				>
					{assignments.map((assignment, index) => (
						<Text key={index}>
							<Text color="green">{assignment.user}</Text> →{' '}
							<Text color="blue">{assignment.role}</Text>
						</Text>
					))}
				</Box>

				<Box marginTop={2}>
					<SelectInput
						items={[{ label: 'Continue', value: 'continue' }]}
						onSelect={() => handleContinue()}
					/>
				</Box>
			</Box>
		);
	}

	// Confirmation screen
	if (currentStep === 'confirming') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold>Confirm Role Assignments</Text>

				<Box
					flexDirection="column"
					marginTop={1}
					borderStyle="single"
					paddingX={1}
				>
					{assignments.map((assignment, index) => (
						<Text key={index}>
							<Text color="green">{assignment.user}</Text> →{' '}
							<Text color="blue">{assignment.role}</Text>
						</Text>
					))}
				</Box>

				<Box marginTop={2}>
					<SelectInput
						items={[
							{ label: '✓ Confirm and Process Assignments', value: 'confirm' },
							{ label: '✎ Edit Assignments', value: 'edit' },
						]}
						onSelect={item => {
							if (item.value === 'confirm') {
								handleConfirm();
							} else {
								handleEdit();
							}
						}}
					/>
				</Box>
			</Box>
		);
	}

	// Role selection screen (default)
	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Assign Roles to Users</Text>

			<Box flexDirection="column" marginTop={1}>
				<Text>
					Progress: {currentUserIndex + 1}/{users.length} users
				</Text>

				<Box flexDirection="column" marginTop={1}>
					<Text>
						Assigning role for user: <Text color="green">{currentUser}</Text>
					</Text>

					<Box marginTop={1}>
						<Text>Select a role:</Text>
					</Box>

					<SelectInput
						items={availableRoles.map(role => ({
							label: role,
							value: role,
						}))}
						onSelect={handleRoleSelect}
					/>
				</Box>
			</Box>

			{assignments.length > 0 && (
				<Box
					flexDirection="column"
					marginTop={1}
					borderStyle="single"
					paddingX={1}
				>
					<Text bold>Current Assignments:</Text>
					{assignments.map((assignment, index) => (
						<Text key={index}>
							<Text color="green">{assignment.user}</Text> →{' '}
							<Text color="blue">{assignment.role}</Text>
						</Text>
					))}
				</Box>
			)}
		</Box>
	);
}

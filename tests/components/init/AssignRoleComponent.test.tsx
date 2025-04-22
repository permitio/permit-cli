import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Text } from 'ink';
import AssignRoleComponent from '../../../source/components/init/AssignRoleComponent.js';

// Mock hooks
vi.mock('../../../source/hooks/useRolesApi.js', () => ({
	useRolesApi: vi.fn(),
}));

vi.mock('../../../source/hooks/useAssignRoleApi.js', () => ({
	useAssignRoleApi: vi.fn(),
}));

// Mock ink-spinner
vi.mock('ink-spinner', () => ({
	default: () => <Text>[spinner]</Text>,
}));

// Mock for SelectInput
let selectInputHandler:
	| ((item: { value: string; label: string }) => void)
	| null = null;

vi.mock('ink-select-input', () => ({
	default: ({
		items,
		onSelect,
	}: {
		items: Array<{ label: string; value: string }>;
		onSelect: (item: { label: string; value: string }) => void;
	}) => {
		// Store the callback for testing
		selectInputHandler = onSelect;

		return <Text>SelectInput: {items.map(item => item.label).join(', ')}</Text>;
	},
}));

// Import the mocked hooks to control their behavior
import { useRolesApi } from '../../../source/hooks/useRolesApi.js';
import { useAssignRoleApi } from '../../../source/hooks/useAssignRoleApi.js';
import delay from 'delay';

describe('AssignRoleComponent', () => {
	// Mock implementations
	const mockGetExistingRoles = vi.fn();
	const mockAssignBulkRoles = vi.fn();

	// Mock props
	const mockUsers = ['user1', 'user2'];
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();

	const mockedUseRolesApi = useRolesApi as unknown as ReturnType<typeof vi.fn>;
	const mockedUseAssignRoleApi = useAssignRoleApi as unknown as ReturnType<
		typeof vi.fn
	>;

	beforeEach(() => {
		vi.resetAllMocks();

		// Default mock implementations
		mockGetExistingRoles.mockResolvedValue(
			new Set(['admin', 'editor', 'viewer']),
		);
		mockAssignBulkRoles.mockResolvedValue(undefined);

		// Default hook states
		mockedUseRolesApi.mockReturnValue({
			getExistingRoles: mockGetExistingRoles,
			status: 'idle',
		});

		mockedUseAssignRoleApi.mockReturnValue({
			assignBulkRoles: mockAssignBulkRoles,
			status: 'idle',
			errorMessage: null,
		});

		// Reset the handler
		selectInputHandler = null;
	});

	afterEach(() => {
		cleanup();
	});

	it('should show loading state when fetching roles', async () => {
		mockedUseRolesApi.mockReturnValue({
			getExistingRoles: mockGetExistingRoles,
			status: 'processing',
		});

		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		await delay(100); // Allow time for loading state to be set

		expect(lastFrame()).toContain('[spinner] Loading available roles');
		expect(mockGetExistingRoles).toHaveBeenCalled();
	});

	it('should call onError if no roles are available', async () => {
		mockGetExistingRoles.mockResolvedValueOnce(new Set([]));

		render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for promise to resolve
		await vi.waitFor(() => {
			expect(mockOnError).toHaveBeenCalledWith(
				'No roles available to assign. Please create roles first.',
			);
		});
	});

	it('should call onError if role fetching fails', async () => {
		mockGetExistingRoles.mockRejectedValueOnce(new Error('API error'));

		render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for promise to resolve
		await vi.waitFor(() => {
			expect(mockOnError).toHaveBeenCalledWith(
				'Failed to fetch roles: API error',
			);
		});
	});

	it('should render the role selection UI with available roles', async () => {
		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assign Roles to Users');
			expect(lastFrame()).toContain('Progress: 1/2 users');
			expect(lastFrame()).toContain('Assigning role for user: user1');
			expect(lastFrame()).toContain('SelectInput: admin, editor, viewer');
		});
	});

	it('should handle selecting a role for a user and move to the next user', async () => {
		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Simulate selecting a role for first user
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
		}

		// Should update to show next user
		expect(lastFrame()).toContain('Assigning role for user: user2');
		expect(lastFrame()).toContain('Current Assignments:');
		expect(lastFrame()).toContain('user1 → admin');
	});

	it('should move to confirmation after selecting roles for all users', async () => {
		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Select role for first user
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
		}

		// Select role for second user
		if (selectInputHandler) {
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Should now be at confirmation step
		expect(lastFrame()).toContain('Confirm Role Assignments');
		expect(lastFrame()).toContain('user1 → admin');
		expect(lastFrame()).toContain('user2 → editor');
		expect(lastFrame()).toContain(
			'SelectInput: ✓ Confirm and Process Assignments, ✎ Edit Assignments',
		);
	});

	it('should show processing state when assigning roles', async () => {
		// Set up mock for assign roles status
		let statusUpdater: (status: string) => void;

		mockedUseAssignRoleApi.mockImplementation(() => {
			const [status, setStatus] = React.useState('idle');
			// Store the status setter for use in the test
			statusUpdater = setStatus;

			return {
				assignBulkRoles: mockAssignBulkRoles.mockImplementation(() => {
					setStatus('processing');
					return Promise.resolve();
				}),
				status,
				errorMessage: null,
			};
		});

		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Select roles for both users
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Select confirm option
		if (selectInputHandler) {
			selectInputHandler({
				label: '✓ Confirm and Process Assignments',
				value: 'confirm',
			});
		}

		// Should now show processing state
		expect(lastFrame()).toContain('[spinner] Assigning roles to users');

		// Update status to done via the captured setter
		if (statusUpdater) {
			statusUpdater('done');
		}

		// Now should show success
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Role assignments completed successfully');
		});
	});

	it('should call onComplete when continuing after successful assignment', async () => {
		// Set up mock for assign roles status to return done
		mockedUseAssignRoleApi.mockReturnValue({
			assignBulkRoles: mockAssignBulkRoles.mockImplementation(() => {
				return Promise.resolve();
			}),
			status: 'done',
			errorMessage: null,
		});

		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load and proceed through flow
		await vi.waitFor(() => {
			expect(lastFrame()).not.toContain('Loading available roles');
		});

		// Select roles for both users
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Select confirm option
		if (selectInputHandler) {
			selectInputHandler({
				label: '✓ Confirm and Process Assignments',
				value: 'confirm',
			});
		}

		// Should show success screen with continue button
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Role assignments completed successfully');
			expect(lastFrame()).toContain('SelectInput: Continue');
		});

		// Select continue
		if (selectInputHandler) {
			selectInputHandler({ label: 'Continue', value: 'continue' });
		}

		// Should call onComplete
		expect(mockOnComplete).toHaveBeenCalled();
	});

	it('should return to editing when edit option is selected in confirmation', async () => {
		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Select roles for both users
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Select edit option
		if (selectInputHandler) {
			selectInputHandler({ label: '✎ Edit Assignments', value: 'edit' });
		}

		// Should return to first user
		expect(lastFrame()).toContain('Progress: 1/2 users');
		expect(lastFrame()).toContain('Assigning role for user: user1');
		// Current assignments should be reset
		expect(lastFrame()).not.toContain('Current Assignments:');
	});

	it('should call onError if there is an API error during role assignment', async () => {
		// Mock an error during role assignment
		mockAssignBulkRoles.mockRejectedValueOnce(new Error('Assignment failed'));

		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Select roles for both users
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Select confirm option
		if (selectInputHandler) {
			selectInputHandler({
				label: '✓ Confirm and Process Assignments',
				value: 'confirm',
			});
		}

		// Should call onError with the error message
		await vi.waitFor(() => {
			expect(mockOnError).toHaveBeenCalledWith(
				'Failed to assign roles: Assignment failed',
			);
		});
	});

	it('should call onError if errorMessage is returned from the hook', async () => {
		// Set up error in the hook
		mockedUseAssignRoleApi.mockReturnValue({
			assignBulkRoles: mockAssignBulkRoles,
			status: 'error',
			errorMessage: 'Hook error occurred',
		});

		render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Should call onError with the error message from the hook
		await vi.waitFor(() => {
			expect(mockOnError).toHaveBeenCalledWith('Hook error occurred');
		});
	});

	it('should correctly pass the role assignment data to the API', async () => {
		const { lastFrame } = render(
			<AssignRoleComponent
				users={mockUsers}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for roles to load
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Assigning role for user: user1');
		});

		// Select roles for both users
		if (selectInputHandler) {
			selectInputHandler({ label: 'admin', value: 'admin' });
			selectInputHandler({ label: 'editor', value: 'editor' });
		}

		// Select confirm option
		if (selectInputHandler) {
			selectInputHandler({
				label: '✓ Confirm and Process Assignments',
				value: 'confirm',
			});
		}

		// Check the data passed to assignBulkRoles
		await vi.waitFor(() => {
			expect(mockAssignBulkRoles).toHaveBeenCalledWith([
				{ user: 'user1', role: 'admin', tenant: 'default' },
				{ user: 'user2', role: 'editor', tenant: 'default' },
			]);
		});
	});
});

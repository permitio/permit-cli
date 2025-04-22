import { useAssignRoleApi } from '../../source/hooks/useAssignRoleApi.js';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import delay from 'delay';

// Create a mock for the client
const mockPOST = vi.fn();
const mockAuthenticatedApiClient = vi.fn().mockReturnValue({
	POST: mockPOST,
});

// Mock the useClient hook
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: mockAuthenticatedApiClient,
	}),
}));

describe('useAssignRoleApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPOST.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it('should initialize with idle status and no error message', () => {
		// Arrange & Act
		let status, errorMessage;

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			errorMessage = hook.errorMessage;
			return null;
		}

		render(<TestComponent />);

		// Assert
		expect(status).toBe('idle');
		expect(errorMessage).toBeNull();
	});

	it('should expose assignBulkRoles function', () => {
		// Arrange & Act
		let assignBulkRoles;

		function TestComponent() {
			const hook = useAssignRoleApi();
			assignBulkRoles = hook.assignBulkRoles;
			return null;
		}

		render(<TestComponent />);

		// Assert
		expect(typeof assignBulkRoles).toBe('function');
	});

	it('should set status to processing while making API call', async () => {
		// Arrange
		mockPOST.mockImplementation(
			() =>
				new Promise(resolve => {
					// Never resolve to keep it in processing state
					setTimeout(() => {}, 1000);
				}),
		);

		// Act
		let status, assignBulkRoles;
		const statusValues: string[] = [];

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			assignBulkRoles = hook.assignBulkRoles;
			React.useEffect(() => {
				statusValues.push(hook.status);
			}, [hook.status]);

			return <Text>Status: {hook.status}</Text>;
		}

		const { lastFrame } = render(<TestComponent />);

		// Initial state should be idle
		expect(status).toBe('idle');
		await delay(50); // Wait a bit to ensure the initial state is captured
		expect(statusValues).toEqual(['idle']);

		// Call the function without waiting for it to resolve
		assignBulkRoles([{ user: 'user1', role: 'admin', tenant: 'default' }]);

		await vi.waitFor(() => {
			// Assert
			expect(statusValues).toContain('processing');
			expect(lastFrame()).toContain('Status: processing');
			expect(mockPOST).toHaveBeenCalledWith(
				'/v2/facts/{proj_id}/{env_id}/role_assignments/bulk',
				undefined,
				[{ user: 'user1', role: 'admin', tenant: 'default' }],
				undefined,
			);
		});
	});

	it('should set status to done after successful API call', async () => {
		// Arrange
		mockPOST.mockResolvedValue({ error: null, data: { success: true } });

		// Act
		let status, assignBulkRoles;
		const statusValues: string[] = [];

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			assignBulkRoles = hook.assignBulkRoles;
			React.useEffect(() => {
				statusValues.push(hook.status);
			}, [hook.status]);

			return <Text>Status: {hook.status}</Text>;
		}

		const { lastFrame } = render(<TestComponent />);

		// Call the function
		await assignBulkRoles([
			{ user: 'user1', role: 'admin', tenant: 'default' },
		]);

		// Wait for state updates to be processed
		await vi.waitFor(() => {
			expect(statusValues).toContain('done');
			expect(lastFrame()).toContain('Status: done');
			expect(mockPOST).toHaveBeenCalledTimes(1);
		});
	});

	it('should set status to error and store error message when API call fails', async () => {
		// Arrange
		const errorText = 'API request failed';
		mockPOST.mockResolvedValue({ error: errorText, data: null });

		// Act
		let status, errorMessage, assignBulkRoles;

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			errorMessage = hook.errorMessage;
			assignBulkRoles = hook.assignBulkRoles;

			return (
				<Text>
					Status: {hook.status}, Error: {hook.errorMessage || 'none'}
				</Text>
			);
		}

		const { lastFrame } = render(<TestComponent />);

		// Call the function
		await assignBulkRoles([
			{ user: 'user1', role: 'admin', tenant: 'default' },
		]);

		// Wait for state updates
		await vi.waitFor(() => {
			expect(status).toBe('error');
			expect(errorMessage).toBe(errorText);
			expect(lastFrame()).toContain(`Status: error, Error: ${errorText}`);
		});
	});

	it('should reset status to processing on a second call after error', async () => {
		// Arrange - first call fails
		mockPOST.mockResolvedValueOnce({ error: 'API error', data: null });
		// Second call succeeds
		mockPOST.mockResolvedValueOnce({ error: null, data: { success: true } });

		// Act
		let status, errorMessage, assignBulkRoles;
		const statusHistory: string[] = [];

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			errorMessage = hook.errorMessage;
			assignBulkRoles = hook.assignBulkRoles;

			React.useEffect(() => {
				statusHistory.push(hook.status);
			}, [hook.status]);

			return null;
		}

		render(<TestComponent />);

		// First call - should fail
		await assignBulkRoles([
			{ user: 'user1', role: 'admin', tenant: 'default' },
		]);

		// After first call - should be in error state
		expect(status).toBe('error');
		expect(errorMessage).toBe('API error');

		// Second call - should succeed
		await assignBulkRoles([
			{ user: 'user2', role: 'viewer', tenant: 'default' },
		]);

		await vi.waitFor(() => {
			// After second call - should be in done state
			expect(status).toBe('done');

			// Error message doesn't get cleared
			expect(errorMessage).toBe('API error');

			// Full status history
			expect(statusHistory).toContain('idle');
			expect(statusHistory).toContain('processing');
			expect(statusHistory).toContain('error');
			expect(statusHistory).toContain('done');

			expect(mockPOST).toHaveBeenCalledTimes(2);
		});
	});

	it('should handle empty role assignments array correctly', async () => {
		// Arrange
		mockPOST.mockResolvedValue({ error: null, data: { success: true } });

		// Act
		let status, assignBulkRoles;

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			assignBulkRoles = hook.assignBulkRoles;
			return null;
		}

		render(<TestComponent />);

		// Call with empty array
		await assignBulkRoles([]);

		await vi.waitFor(() => {
			// Assert
			expect(status).toBe('done');
			expect(mockPOST).toHaveBeenCalledWith(
				'/v2/facts/{proj_id}/{env_id}/role_assignments/bulk',
				undefined,
				[],
				undefined,
			);
		});
	});

	it('should not change state if component unmounts before API call completes', async () => {
		// Arrange - Create a promise we can resolve manually
		let resolvePromise: (value: any) => void;
		mockPOST.mockImplementation(
			() =>
				new Promise(resolve => {
					resolvePromise = resolve;
				}),
		);

		// Act
		let status, assignBulkRoles;

		function TestComponent() {
			const hook = useAssignRoleApi();
			status = hook.status;
			assignBulkRoles = hook.assignBulkRoles;
			return null;
		}

		const { unmount } = render(<TestComponent />);

		// Start API call
		assignBulkRoles([{ user: 'user1', role: 'admin', tenant: 'default' }]);

		// Status should be processing
		expect(status).toBe('processing');

		// Unmount component
		unmount();

		// Complete API call after unmount
		resolvePromise({ error: null, data: { success: true } });

		// Wait a bit to ensure any potential state updates would have happened
		await delay(50);

		// The important thing is that no errors are thrown when state updates
		// are attempted after unmount.
	});

	it('should use different callback instances when dependencies change', () => {
		// Arrange & Act
		let initialAssignBulkRoles, afterChangeAssignBulkRoles;
		const mockInitialClient = vi.fn().mockReturnValue({ POST: vi.fn() });
		const mockUpdatedClient = vi.fn().mockReturnValue({ POST: vi.fn() });

		// Start with initial implementation
		mockAuthenticatedApiClient.mockImplementation(mockInitialClient);

		function TestComponent({ clientChanged }: { clientChanged: boolean }) {
			const hook = useAssignRoleApi();

			React.useEffect(() => {
				if (!clientChanged) {
					initialAssignBulkRoles = hook.assignBulkRoles;
				} else {
					afterChangeAssignBulkRoles = hook.assignBulkRoles;
				}
			}, [clientChanged, hook.assignBulkRoles]);

			return null;
		}

		const { rerender } = render(<TestComponent clientChanged={false} />);

		// Change the client implementation
		mockAuthenticatedApiClient.mockImplementation(mockUpdatedClient);

		// Rerender with changed client
		rerender(<TestComponent clientChanged={true} />);

		// Assert
		expect(initialAssignBulkRoles).not.toBe(afterChangeAssignBulkRoles);
	});

	it('should provide memoized return values for unchanged states', () => {
		// Arrange & Act
		let prevReturn: any, currReturn: any;
		let renderCount = 0;

		function TestComponent() {
			const hook = useAssignRoleApi();
			renderCount++;

			if (renderCount === 1) {
				prevReturn = hook;
			} else {
				currReturn = hook;
			}

			return null;
		}

		const { rerender } = render(<TestComponent />);
		rerender(<TestComponent />);

		// Assert
		expect(prevReturn).toBe(currReturn);
	});
});

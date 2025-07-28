import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react', () => {
	const originalModule = vi.importActual('react');
	return {
		...originalModule,
		// Make useCallback just return the callback function
		useCallback: (callback: any) => callback,
		// Make useMemo just return the value
		useMemo: (factory: any) => factory(),
	};
});

// Create mock functions
const mockGet = vi.fn();
const mockPost = vi.fn();

// Mock all required dependencies
vi.mock('../../../source/hooks/useClient', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGet,
			POST: mockPost,
		}),
	}),
}));

vi.mock('../../../source/components/AuthProvider', () => ({
	useAuth: () => ({
		scope: {
			project_id: 'test-project',
		},
	}),
}));

vi.mock('../../../source/hooks/migration/useMigrateRoles', () => ({
	default: () => ({
		getRoles: () =>
			Promise.resolve({
				roles: [{ key: 'admin' }, { key: 'editor' }],
				error: null,
			}),
	}),
}));

import useMigrateRoleAssignments from '../../../source/hooks/migration/useMigrateRoleAssignments';

describe('useMigrateRoleAssignments', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	it('should migrate role assignments successfully', async () => {
		// Mock source role assignments
		mockGet.mockResolvedValueOnce({
			data: [
				{ user: 'user1', role: 'admin', tenant: 'default' },
				{ user: 'user2', role: 'editor', tenant: 'default' },
			],
			error: null,
		});

		// Mock successful POST responses
		mockPost
			.mockResolvedValueOnce({ error: null })
			.mockResolvedValueOnce({ error: null });

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments('source-env', 'target-env');

		expect(result.total).toBe(2);
		expect(result.success).toBe(2);
		expect(result.failed).toBe(0);
		expect(mockPost).toHaveBeenCalledTimes(2);
	});

	it('should handle role that does not exist in target environment', async () => {
		// Mock source role assignments
		mockGet.mockResolvedValueOnce({
			data: [{ user: 'user1', role: 'nonexistent', tenant: 'default' }],
			error: null,
		});

		// Mock POST attempt with error for non-existent role
		mockPost.mockResolvedValueOnce({ error: "could not find 'Role'" });

		// Then mock POST attempt to create the role
		mockPost.mockResolvedValueOnce({ error: null });

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments('source-env', 'target-env');

		expect(result.total).toBe(1);
		expect(result.failed).toBe(0);
		expect(mockPost).toHaveBeenCalledTimes(2);
	});

	it('should handle conflicts with override strategy', async () => {
		// Mock source role assignments
		mockGet.mockResolvedValueOnce({
			data: [{ user: 'user1', role: 'admin', tenant: 'default' }],
			error: null,
		});

		// Mock POST response indicating the assignment already exists
		mockPost.mockResolvedValueOnce({ error: 'already exists' });

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments(
			'source-env',
			'target-env',
			'override',
		);

		expect(result.total).toBe(1);
		expect(result.success).toBe(1);
		expect(result.failed).toBe(0);
	});

	it('should handle conflicts with fail strategy', async () => {
		// Mock source role assignments
		mockGet.mockResolvedValueOnce({
			data: [{ user: 'user1', role: 'admin', tenant: 'default' }],
			error: null,
		});

		// Mock POST response indicating the assignment already exists
		mockPost.mockResolvedValueOnce({ error: 'already exists' });

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments(
			'source-env',
			'target-env',
			'fail',
		);

		expect(result.total).toBe(1);
		expect(result.success).toBe(0);
		expect(result.failed).toBe(1);
	});

	it('should handle API errors', async () => {
		// Mock source role assignments
		mockGet.mockResolvedValueOnce({
			data: [{ user: 'user1', role: 'admin', tenant: 'default' }],
			error: null,
		});

		// Mock POST error with a distinct error message that won't trigger special handling
		mockPost.mockResolvedValueOnce({
			error: 'Generic API error that does not match any special conditions',
		});

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments('source-env', 'target-env');

		expect(result.total).toBe(1);
		expect(result.success).toBe(0); // No successes
		expect(result.failed).toBe(1); // One failure
	});

	it('should filter out invalid assignments', async () => {
		// Mock source role assignments with some invalid ones
		mockGet.mockResolvedValueOnce({
			data: [
				{ user: 'user1', role: 'admin', tenant: 'default' }, // Valid
				{ /* missing user */ role: 'admin', tenant: 'default' }, // Invalid
				{ user: 'user2', /* missing role */ tenant: 'default' }, // Invalid
			],
			error: null,
		});

		// Mock successful POST response for the valid assignment
		mockPost.mockResolvedValueOnce({ error: null }); // Ensure this returns success

		const { migrateRoleAssignments } = useMigrateRoleAssignments();
		const result = await migrateRoleAssignments('source-env', 'target-env');

		expect(result.total).toBe(3);
		expect(result.success).toBe(1);
		expect(result.failed).toBe(2);
		expect(mockPost).toHaveBeenCalledTimes(1); // Only one valid POST
	});
});

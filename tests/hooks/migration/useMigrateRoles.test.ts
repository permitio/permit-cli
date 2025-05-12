// tests/hooks/migration/useMigrateRoles.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React first - this is critical
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
const mockPatch = vi.fn();

// Mock all required dependencies
vi.mock('../../../source/hooks/useClient', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGet,
			POST: mockPost,
			PATCH: mockPatch,
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

// Import the module under test AFTER mocking dependencies
import useMigrateRoles from '../../../source/hooks/migration/useMigrateRoles';

describe('useMigrateRoles', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	describe('getRoles', () => {
		it('should fetch roles successfully', async () => {
			const mockRoles = [
				{ key: 'admin', name: 'Admin', description: 'Administrator role' },
				{ key: 'editor', name: 'Editor', description: 'Editor role' },
			];

			mockGet.mockResolvedValueOnce({ data: mockRoles, error: null });

			const { getRoles } = useMigrateRoles();
			const result = await getRoles('env-id');

			expect(result.roles).toEqual(mockRoles);
			expect(result.error).toBeNull();
			expect(mockGet).toHaveBeenCalledWith(
				'/v2/schema/{proj_id}/{env_id}/roles',
				{ env_id: 'env-id' },
			);
		});

		it('should handle empty roles', async () => {
			mockGet.mockResolvedValueOnce({ data: [], error: null });

			const { getRoles } = useMigrateRoles();
			const result = await getRoles('env-id');

			expect(result.roles).toEqual([]);
			expect(result.error).toBe('No roles found');
		});

		it('should handle API errors', async () => {
			mockGet.mockResolvedValueOnce({ data: null, error: 'API error' });

			const { getRoles } = useMigrateRoles();
			const result = await getRoles('env-id');

			expect(result.roles).toEqual([]);
			expect(result.error).toBe('API error');
		});
	});

	describe('migrateRoles', () => {
		it('should migrate roles successfully', async () => {
			// Mock source roles
			mockGet.mockResolvedValueOnce({
				data: [
					{ key: 'admin', name: 'Admin', description: 'Administrator role' },
					{ key: 'editor', name: 'Editor', description: 'Editor role' },
				],
				error: null,
			});

			// Mock target roles (empty)
			mockGet.mockResolvedValueOnce({ data: [], error: null });

			// Mock successful POST responses
			mockPost
				.mockResolvedValueOnce({ error: null })
				.mockResolvedValueOnce({ error: null });

			const { migrateRoles } = useMigrateRoles();
			const result = await migrateRoles('source-env', 'target-env');

			expect(result.total).toBe(2);
			expect(result.success).toBe(2);
			expect(result.failed).toBe(0);
			expect(mockPost).toHaveBeenCalledTimes(2);
		});

		it('should handle conflict with override strategy', async () => {
			// Mock source roles
			mockGet.mockResolvedValueOnce({
				data: [
					{ key: 'admin', name: 'Admin', description: 'Administrator role' },
				],
				error: null,
			});

			// Mock target roles (contains the same role)
			mockGet.mockResolvedValueOnce({
				data: [{ key: 'admin', name: 'Admin', description: 'Old description' }],
				error: null,
			});

			// Mock successful PATCH response
			mockPatch.mockResolvedValueOnce({ error: null });

			const { migrateRoles } = useMigrateRoles();
			const result = await migrateRoles('source-env', 'target-env', 'override');

			expect(result.total).toBe(1);
			expect(result.success).toBe(1);
			expect(result.failed).toBe(0);
			expect(mockPost).not.toHaveBeenCalled();
			expect(mockPatch).toHaveBeenCalledTimes(1);
		});

		it('should handle conflict with fail strategy', async () => {
			// Mock source roles
			mockGet.mockResolvedValueOnce({
				data: [
					{ key: 'admin', name: 'Admin', description: 'Administrator role' },
				],
				error: null,
			});

			// Mock target roles (contains the same role)
			mockGet.mockResolvedValueOnce({
				data: [{ key: 'admin', name: 'Admin', description: 'Old description' }],
				error: null,
			});

			const { migrateRoles } = useMigrateRoles();
			const result = await migrateRoles('source-env', 'target-env', 'fail');

			expect(result.total).toBe(1);
			expect(result.success).toBe(0);
			expect(result.failed).toBe(1);
			expect(mockPost).not.toHaveBeenCalled();
			expect(mockPatch).not.toHaveBeenCalled();
		});
	});
});

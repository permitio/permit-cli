import { expect, it, describe, vi, beforeEach } from 'vitest';
import { usePermitUrlMappingApi } from '../../../source/hooks/openapi/usePermitUrlMappingApi';

// Mock the auth hook
vi.mock('../../../source/components/AuthProvider', () => ({
	useAuth: vi.fn(() => ({
		authToken: 'mock_token',
		loading: false,
		error: null,
		scope: {
			organization_id: 'org_1',
			project_id: 'proj_1',
			environment_id: 'env_1',
		},
	})),
}));

// Mock function implementations
const mockDeleteFn = vi.fn().mockImplementation(() => {
	return {
		data: { success: true },
		error: null,
		response: { status: 204 },
	};
});

const mockPostFn = vi.fn().mockImplementation(() => {
	return {
		data: [
			{
				id: 'url1',
				url: '/api/users',
				http_method: 'GET',
				resource: 'user',
				action: 'read',
			},
		],
		error: null,
		response: { status: 201 },
	};
});

// Mock the client hook
vi.mock('../../../source/hooks/useClient', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			DELETE: mockDeleteFn,
			POST: mockPostFn,
		}),
	}),
}));

// Mock React hooks
vi.mock('react', async () => {
	const React = await vi.importActual('react');
	return {
		...React,
		useCallback: fn => fn,
		useMemo: fn => fn(),
	};
});

describe('usePermitUrlMappingApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should delete URL mappings by source', async () => {
		const { deleteUrlMappings } = usePermitUrlMappingApi();

		const deleteResult = await deleteUrlMappings('openapi');

		expect(mockDeleteFn).toHaveBeenCalledWith(
			'/v2/facts/{proj_id}/{env_id}/proxy_configs/{proxy_config_id}',
			{ proxy_config_id: 'openapi' },
			undefined,
			undefined,
		);
		expect(deleteResult.success).toBeTruthy();
		expect(deleteResult.data).toBeNull();
		expect(deleteResult.status).toBe(204);
	});

	it('should handle DELETE error response', async () => {
		// Override the mock for this test
		mockDeleteFn.mockResolvedValueOnce({
			data: null,
			error: { detail: 'Resource not found' },
			response: { status: 404 },
		});

		const { deleteUrlMappings } = usePermitUrlMappingApi();

		const deleteResult = await deleteUrlMappings('nonexistent');

		expect(deleteResult.success).toBeFalsy();
		expect(deleteResult.error).toContain('Resource not found');
	});

	it('should create URL mappings', async () => {
		const { createUrlMappings } = usePermitUrlMappingApi();

		const mappings = [
			{
				url: '/api/users',
				http_method: 'GET',
				resource: 'user',
				action: 'read',
			},
		];

		const createResult = await createUrlMappings(
			mappings,
			'Bearer',
			'Authorization',
		);

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/facts/{proj_id}/{env_id}/proxy_configs',
			undefined,
			{
				key: 'openapi',
				name: 'OpenAPI Generated Mappings',
				mapping_rules: mappings,
				auth_mechanism: 'Bearer',
				secret: 'Authorization',
			},
		);
		expect(createResult.success).toBeTruthy();
		expect(createResult.data).toHaveLength(1);
		expect(createResult.data[0].url).toBe('/api/users');
		expect(createResult.data[0].resource).toBe('user');
	});

	it('should handle create URL mappings error', async () => {
		// Override the mock for this test
		mockPostFn.mockResolvedValueOnce({
			data: null,
			error: { detail: 'Invalid mapping format' },
			response: { status: 400 },
		});

		const { createUrlMappings } = usePermitUrlMappingApi();

		const mappings = [
			{
				url: '/api/users',
				http_method: 'INVALID',
				resource: 'user',
				action: 'read',
			},
		];

		const createResult = await createUrlMappings(
			mappings,
			'Bearer',
			'Authorization',
		);

		expect(createResult.success).toBeFalsy();
		expect(createResult.error).toContain('Invalid mapping format');
	});

	it('should handle network errors', async () => {
		// Override the mock for this test
		mockDeleteFn.mockRejectedValueOnce(new Error('Network error'));

		const { deleteUrlMappings } = usePermitUrlMappingApi();

		const deleteResult = await deleteUrlMappings('openapi');

		expect(deleteResult.success).toBeFalsy();
		expect(deleteResult.error).toContain('Network error');
	});

	it('should handle JSON error responses', async () => {
		// Override the mock for this test
		mockPostFn.mockRejectedValueOnce('{"detail":"Bad request"}');

		const { createUrlMappings } = usePermitUrlMappingApi();

		const mappings = [
			{
				url: '/api/users',
				http_method: 'GET',
				resource: 'user',
				action: 'read',
			},
		];

		const createResult = await createUrlMappings(
			mappings,
			'Bearer',
			'Authorization',
		);

		expect(createResult.success).toBeFalsy();
		expect(createResult.error).toContain('Bad request');
	});
});

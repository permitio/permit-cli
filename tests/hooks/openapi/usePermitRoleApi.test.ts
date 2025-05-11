import { expect, it, describe, vi, beforeEach } from 'vitest';
import { usePermitRoleApi } from '../../../source/hooks/openapi/usePermitRoleApi';

// Mock GET function that returns different responses based on path
const mockGetFn = vi.fn().mockImplementation(path => {
	if (path.includes('roles/{role_id}')) {
		return {
			data: { key: 'admin', name: 'Admin', permissions: ['user:read'] },
			error: null,
			response: { status: 200 },
		};
	}
	return {
		data: [
			{ key: 'admin', name: 'Admin' },
			{ key: 'editor', name: 'Editor' },
		],
		error: null,
		response: { status: 200 },
	};
});

// Mock POST and PATCH functions
const mockPostFn = vi.fn().mockResolvedValue({
	data: { key: 'viewer', name: 'Viewer' },
	error: null,
	response: { status: 201 },
});

const mockPatchFn = vi.fn().mockResolvedValue({
	data: {
		key: 'admin',
		name: 'Administrator',
		permissions: ['user:read', 'user:write'],
	},
	error: null,
	response: { status: 200 },
});

// Mock the client hook
vi.mock('../../../source/hooks/useClient', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGetFn,
			POST: mockPostFn,
			PATCH: mockPatchFn,
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

describe('usePermitRoleApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should list roles', async () => {
		const { listRoles } = usePermitRoleApi();

		const listResult = await listRoles();

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
		);
		expect(listResult.data).toHaveLength(2);
		expect(listResult.data[0].key).toBe('admin');
	});

	it('should get a role by key', async () => {
		const { getRole } = usePermitRoleApi();

		const roleResult = await getRole('admin');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles/{role_id}',
			{
				role_id: 'admin',
			},
		);
		expect(roleResult.data.key).toBe('admin');
		expect(roleResult.data.permissions).toContain('user:read');
	});

	it('should create a role', async () => {
		const { createRole } = usePermitRoleApi();

		const createResult = await createRole('viewer', 'Viewer');

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
			undefined,
			{
				key: 'viewer',
				name: 'Viewer',
				description: 'Role created from OpenAPI spec',
				permissions: [],
			},
		);
		expect(createResult.data).toEqual({ key: 'viewer', name: 'Viewer' });
	});

	it('should update a role with permissions', async () => {
		const { updateRole } = usePermitRoleApi();

		const updateResult = await updateRole('admin', 'Administrator', [
			'user:read',
			'user:write',
		]);

		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles/{role_id}',
			{ role_id: 'admin' },
			{
				name: 'Administrator',
				description: 'Role created from OpenAPI spec (updated)',
				permissions: ['user:read', 'user:write'],
			},
		);
		expect(updateResult.data).toEqual({
			key: 'admin',
			name: 'Administrator',
			permissions: ['user:read', 'user:write'],
		});
	});

	it('should create a resource role', async () => {
		const { createResourceRole } = usePermitRoleApi();

		await createResourceRole('user', 'owner', 'User Owner', ['read', 'write']);

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles',
			{ resource_id: 'user' },
			{
				key: 'owner',
				name: 'User Owner',
				description: 'Role created from OpenAPI spec for user',
				permissions: ['read', 'write'],
			},
		);
	});

	it('should update a resource role', async () => {
		const { updateResourceRole } = usePermitRoleApi();

		// First mock the GET to get existing role
		mockGetFn.mockImplementationOnce(() => ({
			data: { key: 'owner', name: 'Owner', extends: [] },
			error: null,
		}));

		await updateResourceRole('user', 'owner', ['read', 'write', 'delete']);

		// First should get the existing role
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
			{ resource_id: 'user', role_id: 'owner' },
		);

		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
			{ resource_id: 'user', role_id: 'owner' },
			{
				permissions: ['read', 'write', 'delete'],
				extends: [],
			},
		);
	});
});

import { expect, it, describe, vi, beforeEach } from 'vitest';
import { usePermitRelationApi } from '../../../source/hooks/openapi/usePermitRelationApi';

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

// Mock React hooks
vi.mock('react', async () => {
	const React = await vi.importActual('react');
	return {
		...React,
		useCallback: fn => fn,
		useMemo: fn => fn(),
	};
});

// Define mock functions outside so we can modify them in tests
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();
const mockPatchFn = vi.fn();

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


vi.useRealTimers();

describe('usePermitRelationApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mock responses
		mockGetFn.mockImplementation(path => {
			if (path.includes('relations/{relation_id}')) {
				return {
					data: {
						key: 'parent',
						name: 'Parent',
						subject_resource: 'project',
						object_resource: 'task',
					},
					error: null,
					response: { status: 200 },
				};
			} else if (path.includes('roles/{role_id}')) {
				
				return {
					data: null,
					error: { detail: 'Not found' },
					response: { status: 404 },
				};
			} else if (path.includes('relations')) {
				return {
					data: {
						data: [
							{
								key: 'parent',
								name: 'Parent',
								subject_resource: 'project',
								object_resource: 'task',
							},
						],
					},
					error: null,
					response: { status: 200 },
				};
			}
			return {
				data: null,
				error: { detail: 'Not found' },
				response: { status: 404 },
			};
		});

		mockPostFn.mockImplementation(path => {
			if (path.includes('relations')) {
				return {
					data: {
						key: 'parent',
						name: 'Parent',
						subject_resource: 'project',
						object_resource: 'task',
					},
					error: null,
					response: { status: 201 },
				};
			} else if (path.includes('roles')) {
				return {
					data: { key: 'resourceRole', name: 'Resource Role' },
					error: null,
					response: { status: 201 },
				};
			}
			return {
				data: {
					base_role: 'admin',
					derived_role: 'taskAdmin',
					resource: 'task',
				},
				error: null,
				response: { status: 201 },
			};
		});

		mockPatchFn.mockResolvedValue({
			data: { key: 'derivedRole', name: 'Derived Role' },
			error: null,
			response: { status: 200 },
		});
	});

	it('should get a relation by key', async () => {
		const { getRelationByKey } = usePermitRelationApi();

		const relationResult = await getRelationByKey('project', 'parent');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations/{relation_id}',
			{ resource_id: 'project', relation_id: 'parent' },
		);
		expect(relationResult.data.key).toBe('parent');
		expect(relationResult.data.subject_resource).toBe('project');
		expect(relationResult.data.object_resource).toBe('task');
		expect(relationResult.success).toBeTruthy();
	});

	it('should handle error when getting relation', async () => {
		// Override the mock to simulate error
		mockGetFn.mockRejectedValueOnce(new Error('Network error'));

		const { getRelationByKey } = usePermitRelationApi();
		const relationResult = await getRelationByKey('nonexistent', 'relation');

		expect(relationResult.success).toBeFalsy();
		expect(relationResult.error).toContain('Network error');
	});

	it('should get resource relations', async () => {
		const { getResourceRelations } = usePermitRelationApi();

		const relationsResult = await getResourceRelations('project');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations',
			{ resource_id: 'project' },
		);
		expect(relationsResult.data).toHaveProperty('data');
		expect(relationsResult.data.data).toHaveLength(1);
		expect(relationsResult.data.data[0].key).toBe('parent');
	});

	it('should create a relation', async () => {
		const { createRelation } = usePermitRelationApi();

		const createResult = await createRelation({
			key: 'parent',
			name: 'Parent',
			subject_resource: 'project',
			object_resource: 'task',
			description: 'Project contains tasks',
		});

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/relations',
			{ resource_id: 'project' },
			{
				key: 'parent',
				name: 'Parent',
				subject_resource: 'task',
				description: 'Project contains tasks',
			},
		);
		expect(createResult.data.key).toBe('parent');
		expect(createResult.success).toBeTruthy();
	});

	it('should handle missing subject/object in createRelation', async () => {
		const { createRelation } = usePermitRelationApi();

		const result = await createRelation({
			key: 'parent',
			name: 'Parent',
		});

		expect(mockPostFn).not.toHaveBeenCalled();
		expect(result.success).toBeFalsy();
		expect(result.error).toContain(
			'Both subject_resource and object_resource are required',
		);
	});

	it('should check if resource role exists', async () => {
		// Override to simulate finding the role
		mockGetFn.mockImplementationOnce(() => ({
			data: { key: 'resourceRole', name: 'Resource Role' },
			error: null,
			response: { status: 200 },
		}));

		const { checkResourceRoleExists } = usePermitRelationApi();

		const { exists, data } = await checkResourceRoleExists('project', 'admin');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
			{ resource_id: 'project', role_id: 'admin' },
		);
		expect(exists).toBeTruthy();
		expect(data).toHaveProperty('key', 'resourceRole');
	});

	
	it('should create resource specific role', async () => {
		// Ensure the role doesn't exist in checkResourceRoleExists
		mockGetFn.mockImplementationOnce(() => ({
			data: null,
			error: { detail: 'Not found' },
			response: { status: 404 },
		}));

		const { createResourceSpecificRole } = usePermitRelationApi();

		const roleResult = await createResourceSpecificRole('task', 'owner');

		// Verify GET was called to check if the role exists
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
			{ resource_id: 'task', role_id: 'owner' },
		);

		// Verify POST was called to create the role (since it doesn't exist)
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles',
			{ resource_id: 'task' },
			{
				key: 'owner',
				name: 'owner',
				description: 'Resource-specific role for task',
			},
		);

		expect(roleResult.data).toHaveProperty('key', 'resourceRole');
		expect(roleResult.success).toBeTruthy();
	}, 10000); 

	
	it('should create a derived role', async () => {
		const { createDerivedRole } = usePermitRelationApi();

		const derivedRoleResult = await createDerivedRole({
			key: 'taskAdmin',
			name: 'Task Admin',
			base_role: 'admin',
			derived_role: 'taskAdmin',
			resource: 'task',
			relation: 'parent',
		});

		// Expect calls to create resource roles and update the role with granted_to
		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
			{ resource_id: 'task', role_id: 'taskAdmin' },
			expect.objectContaining({
				granted_to: expect.objectContaining({
					users_with_role: expect.arrayContaining([
						expect.objectContaining({
							role: 'admin',
							linked_by_relation: 'parent',
						}),
					]),
				}),
			}),
		);
		expect(derivedRoleResult.success).toBeTruthy();
		expect(derivedRoleResult.data).toHaveProperty('base_role', 'admin');
		expect(derivedRoleResult.data).toHaveProperty('derived_role', 'taskAdmin');
	}, 10000);

	it('should handle missing required fields for derived role', async () => {
		const { createDerivedRole } = usePermitRelationApi();

		const derivedRoleResult = await createDerivedRole({
			key: 'incompleteDerivedRole',
			name: 'Incomplete',
		});

		expect(derivedRoleResult.success).toBeFalsy();
		expect(derivedRoleResult.error).toContain('required');
	});

	it('should handle error when creating derived role with no relations', async () => {
		// Mock GET to return empty relations
		mockGetFn.mockImplementationOnce(() => ({
			data: { data: [] },
			error: null,
			response: { status: 200 },
		}));

		const { createDerivedRole } = usePermitRelationApi();

		const derivedRoleResult = await createDerivedRole({
			key: 'errorRole',
			name: 'Error Role',
			base_role: 'admin',
			derived_role: 'errorRole',
			resource: 'resource',
			relation: 'nonexistent',
		});

		expect(derivedRoleResult.success).toBeFalsy();
		
		expect(derivedRoleResult.error).toContain(
			'Could not determine valid relation',
		);
	});
});

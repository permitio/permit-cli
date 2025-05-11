import { expect, it, describe, vi, beforeEach } from 'vitest';
import { usePermitResourceApi } from '../../../source/hooks/openapi/usePermitResourceApi';

// Mock client function calls
const mockGetFn = vi.fn().mockResolvedValue({
	data: [
		{ key: 'user', name: 'User' },
		{ key: 'document', name: 'Document' },
	],
	error: null,
	response: { status: 200 },
});

const mockPostFn = vi.fn().mockResolvedValue({
	data: { key: 'resource', name: 'Resource' },
	error: null,
	response: { status: 201 },
});

const mockPatchFn = vi.fn().mockResolvedValue({
	data: { key: 'resource', name: 'Updated Resource' },
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

describe('usePermitResourceApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should list resources', async () => {
		const { listResources } = usePermitResourceApi();

		const listResult = await listResources();

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
		);
		expect(listResult.data).toHaveLength(2);
		expect(listResult.data[0].key).toBe('user');
		expect(listResult.error).toBeNull();
	});

	it('should create a resource', async () => {
		const { createResource } = usePermitResourceApi();

		const createResult = await createResource('testResource', 'Test Resource');

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
			undefined,
			{
				key: 'testResource',
				name: 'Test Resource',
				description: 'Resource created from OpenAPI spec',
				actions: {},
				attributes: {},
			},
		);
		expect(createResult.data).toEqual({ key: 'resource', name: 'Resource' });
		expect(createResult.error).toBeNull();
	});

	it('should update a resource', async () => {
		const { updateResource } = usePermitResourceApi();

		const updateResult = await updateResource(
			'testResource',
			'Updated Resource',
		);

		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}',
			{ resource_id: 'testResource' },
			{
				name: 'Updated Resource',
				description: 'Resource updated from OpenAPI spec',
			},
		);
		expect(updateResult.data).toEqual({
			key: 'resource',
			name: 'Updated Resource',
		});
		expect(updateResult.error).toBeNull();
	});

	it('should create an action', async () => {
		const { createAction } = usePermitResourceApi();

		const actionResult = await createAction(
			'testResource',
			'read',
			'Read Action',
		);

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/actions',
			{ resource_id: 'testResource' },
			{
				key: 'read',
				name: 'Read Action',
				description: 'Action created from OpenAPI spec',
			},
		);
		expect(actionResult.data).toEqual({ key: 'resource', name: 'Resource' });
		expect(actionResult.error).toBeNull();
	});
});

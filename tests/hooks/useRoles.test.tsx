import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRolesApi } from '../../source/hooks/useRolesApi.js';
import { components } from '../../source/lib/api/v1.js';

// Simple delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Mock the client hook - create mock functions that we can reference
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();
const mockPatchFn = vi.fn();

// Mock at the module level
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGetFn,
			POST: mockPostFn,
			PATCH: mockPatchFn,
		}),
		unAuthenticatedApiClient: () => ({
			GET: vi.fn(),
			POST: vi.fn(),
		}),
	}),
}));

// Test component to call and display hook results
const TestComponent = ({
	operation,
	roles = [{ key: 'admin', name: 'Admin', permissions: ['*:*'] }],
}: {
	operation: 'getExisting' | 'createBulk';
	roles?: components['schemas']['RoleCreate'][];
}) => {
	const { getExistingRoles, createBulkRoles, status, errorMessage } =
		useRolesApi();

	const handleOperation = async () => {
		try {
			if (operation === 'getExisting') {
				const results = await getExistingRoles();
				return Array.from(results).join(',');
			} else if (operation === 'createBulk') {
				await createBulkRoles(roles);
				return 'completed';
			}
			return '';
		} catch (error) {
			console.error('Operation failed:', error);
			return 'error';
		}
	};

	const [result, setResult] = React.useState<string>('');

	React.useEffect(() => {
		handleOperation().then(setResult);
	}, [operation, JSON.stringify(roles)]);

	return (
		<>
			<Text>Status: {status}</Text>
			<Text>Error: {errorMessage || 'none'}</Text>
			<Text>Result: {result}</Text>
		</>
	);
};

describe('useRolesApi', () => {
	beforeEach(() => {
		// Reset mock functions before each test
		vi.resetAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('should get existing roles successfully', async () => {
		// Mock the successful API response
		mockGetFn.mockResolvedValue({
			data: [{ key: 'admin' }, { key: 'user' }],
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: idle');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: admin,user');
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
		);
	});

	it('should handle paginated roles response', async () => {
		// Mock paginated API response
		mockGetFn.mockResolvedValue({
			data: {
				data: [{ key: 'admin' }, { key: 'editor' }],
			},
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Result: admin,editor');
	});

	it('should handle invalid response formats', async () => {
		// Mock invalid response format
		mockGetFn.mockResolvedValue({
			data: { invalid: 'format' }, // Not an array or paged result
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Error: Invalid roles response format');
	});

	it('should create new roles with POST', async () => {
		// Mock empty existing roles
		mockGetFn.mockResolvedValue({
			data: [],
			error: null,
		});

		// Mock successful POST
		mockPostFn.mockResolvedValue({
			data: { key: 'admin' },
			error: null,
		});

		const role = { key: 'admin', name: 'Admin', permissions: ['*:*'] };
		const { lastFrame } = render(
			<TestComponent operation="createBulk" roles={[role]} />,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: completed');
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
			undefined,
			role,
		);
		// PATCH shouldn't be called for new roles
		expect(mockPatchFn).not.toHaveBeenCalled();
	});

	it('should update existing roles with PATCH', async () => {
		// Mock existing roles
		mockGetFn.mockResolvedValue({
			data: [{ key: 'admin' }],
			error: null,
		});

		// Mock successful PATCH
		mockPatchFn.mockResolvedValue({
			data: { key: 'admin' },
			error: null,
		});

		const role = {
			key: 'admin',
			name: 'Administrator',
			permissions: ['posts:read', 'posts:write'],
		};

		const { lastFrame } = render(
			<TestComponent operation="createBulk" roles={[role]} />,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(lastFrame()).toContain('Result: completed');

		// Check that PATCH was called correctly (with key removed from body)
		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles/{role_id}',
			{ role_id: 'admin' },
			{
				name: 'Administrator',
				permissions: ['posts:read', 'posts:write'],
				key: 'admin',
			},
			undefined,
		);

		// POST shouldn't be called for existing roles
		expect(mockPostFn).not.toHaveBeenCalled();
	});

	it('should handle both new and existing roles', async () => {
		// Mock existing roles
		mockGetFn.mockResolvedValue({
			data: [{ key: 'admin' }],
			error: null,
		});

		// Mock successful POST and PATCH
		mockPostFn.mockResolvedValue({ data: { key: 'editor' }, error: null });
		mockPatchFn.mockResolvedValue({ data: { key: 'admin' }, error: null });

		const roles = [
			{
				key: 'admin',
				name: 'Administrator',
				permissions: ['*:*'],
			},
			{
				key: 'editor',
				name: 'Editor',
				permissions: ['posts:read', 'posts:write'],
			},
		];

		const { lastFrame } = render(
			<TestComponent operation="createBulk" roles={roles} />,
		);

		// Wait for the component to process the API response
		await delay(100);

		expect(lastFrame()).toContain('Status: done');

		// Check PATCH was called for admin
		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles/{role_id}',
			{ role_id: 'admin' },
			{ name: 'Administrator', permissions: ['*:*'], key: 'admin' },
			undefined,
		);

		// Check POST was called for editor
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
			undefined,
			{
				key: 'editor',
				name: 'Editor',
				permissions: ['posts:read', 'posts:write'],
			},
		);
	});

	it('should handle errors when updating roles', async () => {
		// Mock existing roles
		mockGetFn.mockResolvedValue({
			data: [{ key: 'admin' }],
			error: null,
		});

		// Mock PATCH error
		mockPatchFn.mockResolvedValue({ data: null, error: 'PATCH error' });

		const role = { key: 'admin', name: 'Admin', permissions: ['*:*'] };
		const { lastFrame } = render(
			<TestComponent operation="createBulk" roles={[role]} />,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: error');
		expect(lastFrame()).toContain('Error: PATCH error');
	});
});

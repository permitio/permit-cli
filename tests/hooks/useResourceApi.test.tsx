import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourcesApi } from '../../source/hooks/useResourcesApi.js';

// Simple delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Create mock functions at module level so they're accessible throughout tests
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();
const mockPatchFn = vi.fn();
const mockUnauthGetFn = vi.fn();
const mockUnauthPostFn = vi.fn();

// Mock the client hook once at module level
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGetFn,
			POST: mockPostFn,
			PATCH: mockPatchFn,
		}),
		unAuthenticatedApiClient: () => ({
			GET: mockUnauthGetFn,
			POST: mockUnauthPostFn,
		}),
	}),
}));

// Test component to call and display hook results
const TestComponent = ({
	operation,
	resources = [{ key: 'test', name: 'Test', actions: {} }],
}: {
	operation: 'getExisting' | 'createBulk';
	resources?: Array<{
		key: string;
		name: string;
		actions: Record<string, any>;
	}>;
}) => {
	const { getExistingResources, createBulkResources, status, errorMessage } =
		useResourcesApi();

	const handleOperation = async () => {
		try {
			if (operation === 'getExisting') {
				const results = await getExistingResources();
				return Array.from(results).join(',');
			} else if (operation === 'createBulk') {
				await createBulkResources(resources);
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
	}, [operation, JSON.stringify(resources)]);

	return (
		<>
			<Text>Status: {status}</Text>
			<Text>Error: {errorMessage || 'none'}</Text>
			<Text>Result: {result}</Text>
		</>
	);
};

describe('useResourceApi', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.resetAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('should get existing resources successfully', async () => {
		// Mock the successful API response
		mockGetFn.mockResolvedValue({
			data: [{ key: 'users' }, { key: 'posts' }],
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		await delay(50);

		expect(lastFrame()).toContain('Status: idle');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: users,posts');
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
		);
	});

	it('should handle errors when getting resources', async () => {
		// Mock an API error
		mockGetFn.mockResolvedValue({
			data: null,
			error: 'API error',
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		await delay(50);

		expect(lastFrame()).toContain('Error: API error');
	});

	it('should create new resources with POST', async () => {
		// Mock empty existing resources
		mockGetFn.mockResolvedValue({
			data: [],
			error: null,
		});

		// Mock successful POST
		mockPostFn.mockResolvedValue({
			data: { key: 'test' },
			error: null,
		});

		const resource = { key: 'test', name: 'Test', actions: {} };
		const { lastFrame } = render(
			<TestComponent operation="createBulk" resources={[resource]} />,
		);

		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: completed');
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
			undefined,
			resource,
		);
		// PATCH shouldn't be called for new resources
		expect(mockPatchFn).not.toHaveBeenCalled();
	});

	it('should update existing resources with PATCH', async () => {
		// Mock existing resources
		mockGetFn.mockResolvedValue({
			data: [{ key: 'existing' }],
			error: null,
		});

		// Mock successful PATCH
		mockPatchFn.mockResolvedValue({
			data: { key: 'existing' },
			error: null,
		});

		const resource = { key: 'existing', name: 'Updated Name', actions: {} };
		const { lastFrame } = render(
			<TestComponent operation="createBulk" resources={[resource]} />,
		);

		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(mockPatchFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}',
			{ resource_id: 'existing' },
			{ name: 'Updated Name', actions: {} }, // key should be removed
			undefined,
		);
		// POST shouldn't be called for existing resources
		expect(mockPostFn).not.toHaveBeenCalled();
	});

	it('should handle both new and existing resources', async () => {
		// Mock existing resources
		mockGetFn.mockResolvedValue({
			data: [{ key: 'existing' }],
			error: null,
		});

		// Mock successful POST and PATCH
		mockPostFn.mockResolvedValue({ data: { key: 'new' }, error: null });
		mockPatchFn.mockResolvedValue({ data: { name: 'existing' }, error: null });

		const resources = [
			{ key: 'existing', name: 'Updated Name', actions: {} },
			{ key: 'new', name: 'New Resource', actions: {} },
		];

		const { lastFrame } = render(
			<TestComponent operation="createBulk" resources={resources} />,
		);

		await delay(100);

		expect(lastFrame()).toContain('Status: done');

		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
			undefined,
			{ key: 'new', name: 'New Resource', actions: {} },
		);
	});

	it('should handle errors when creating resources', async () => {
		// Mock GET success but POST error
		mockGetFn.mockResolvedValue({ data: [], error: null });
		mockPostFn.mockResolvedValue({ data: null, error: 'POST error' });

		const { lastFrame } = render(<TestComponent operation="createBulk" />);

		await delay(50);

		expect(lastFrame()).toContain('Status: error');
		expect(lastFrame()).toContain('Error: POST error');
	});

	it('should handle errors when updating resources', async () => {
		// Mock existing resources
		mockGetFn.mockResolvedValue({
			data: [{ key: 'existing' }],
			error: null,
		});

		// Mock PATCH error
		mockPatchFn.mockResolvedValue({ data: null, error: 'PATCH error' });

		const resource = { key: 'existing', name: 'Test', actions: {} };
		const { lastFrame } = render(
			<TestComponent operation="createBulk" resources={[resource]} />,
		);

		await delay(50);

		expect(lastFrame()).toContain('Status: error');
		expect(lastFrame()).toContain('Error: PATCH error');
	});

	it('should handle invalid response formats', async () => {
		// Mock invalid response format
		mockGetFn.mockResolvedValue({
			data: { invalid: 'format' }, // Not an array or paged result
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="getExisting" />);

		await delay(50);

		expect(lastFrame()).toContain('Error: Invalid resource data format');
	});
});

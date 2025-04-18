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
const mockUnauthGetFn = vi.fn();
const mockUnauthPostFn = vi.fn();

// Mock the client hook once at module level
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGetFn,
			POST: mockPostFn,
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
}: {
	operation: 'getExisting' | 'createBulk';
}) => {
	const { getExistingResources, createBulkResources, status, errorMessage } =
		useResourcesApi();

	const handleOperation = async () => {
		try {
			if (operation === 'getExisting') {
				const results = await getExistingResources();
				return Array.from(results).join(',');
			} else if (operation === 'createBulk') {
				await createBulkResources([{ key: 'test', name: 'Test', actions: {} }]);
				return 'created';
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
	}, [operation]);

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

	it('should create resources successfully', async () => {
		// Mock successful POST
		mockPostFn.mockResolvedValue({
			data: { key: 'test' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent operation="createBulk" />);

		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: created');
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/resources',
			undefined,
			{ key: 'test', name: 'Test', actions: {} },
		);
	});

	it('should handle errors when creating resources', async () => {
		// Mock POST error
		mockPostFn.mockResolvedValue({
			data: null,
			error: 'POST error',
		});

		const { lastFrame } = render(<TestComponent operation="createBulk" />);

		await delay(50);

		expect(lastFrame()).toContain('Status: error');
		expect(lastFrame()).toContain('Error: POST error');
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

import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRolesApi } from '../../source/hooks/useRolesApi.js';

// Simple delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Mock the client hook - create mock functions that we can reference
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();

// Mock at the module level
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			GET: mockGetFn,
			POST: mockPostFn,
		}),
		unAuthenticatedApiClient: () => ({
			GET: vi.fn(),
			POST: vi.fn(),
		}),
	}),
}));

// Test component to call and display hook results
const TestComponent = ({
	projectId,
	environmentId,
	apiKey,
	operation,
}: {
	projectId: string;
	environmentId: string;
	apiKey?: string;
	operation: 'getExisting' | 'createBulk';
}) => {
	const { getExistingRoles, createBulkRoles, status, errorMessage } =
		useRolesApi(projectId, environmentId, apiKey);

	const handleOperation = async () => {
		try {
			if (operation === 'getExisting') {
				const results = await getExistingRoles();
				return Array.from(results).join(',');
			} else if (operation === 'createBulk') {
				await createBulkRoles([
					{ key: 'admin', name: 'Admin', permissions: ['*:*'] },
				]);
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

		const { lastFrame } = render(
			<TestComponent
				projectId="proj123"
				environmentId="env123"
				operation="getExisting"
			/>,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: idle');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: admin,user');
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
			{ proj_id: 'proj123', env_id: 'env123' },
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

		const { lastFrame } = render(
			<TestComponent
				projectId="proj123"
				environmentId="env123"
				operation="getExisting"
			/>,
		);

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

		const { lastFrame } = render(
			<TestComponent
				projectId="proj123"
				environmentId="env123"
				operation="getExisting"
			/>,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Error: Invalid roles response format');
	});

	it('should create roles successfully', async () => {
		// Mock successful POST
		mockPostFn.mockResolvedValue({
			data: { key: 'admin' },
			error: null,
		});

		const { lastFrame } = render(
			<TestComponent
				projectId="proj123"
				environmentId="env123"
				operation="createBulk"
			/>,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: done');
		expect(lastFrame()).toContain('Error: none');
		expect(lastFrame()).toContain('Result: created');
		expect(mockPostFn).toHaveBeenCalledWith(
			'/v2/schema/{proj_id}/{env_id}/roles',
			{ proj_id: 'proj123', env_id: 'env123' },
			{ key: 'admin', name: 'Admin', permissions: ['*:*'] },
		);
	});

	it('should handle errors when creating roles', async () => {
		// Mock POST error
		mockPostFn.mockResolvedValue({
			data: null,
			error: 'POST error',
		});

		const { lastFrame } = render(
			<TestComponent
				projectId="proj123"
				environmentId="env123"
				operation="createBulk"
			/>,
		);

		// Wait for the component to process the API response
		await delay(50);

		expect(lastFrame()).toContain('Status: error');
		expect(lastFrame()).toContain('Error: POST error');
	});
});

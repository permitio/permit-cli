import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceInput } from '../../../source/components/policy/ResourceInput.js';

// Create a mockGetExistingResources function that can be controlled in tests
const mockGetExistingResources = vi.fn().mockResolvedValue(new Set());

// Mock the hooks
vi.mock('../../../source/hooks/useResourcesApi.js', () => ({
	useResourcesApi: () => ({
		getExistingResources: mockGetExistingResources,
		status: 'idle',
	}),
}));

// Mock Text Input component for all tests
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }) => {
		// Store handlers in module scope via global
		vi.stubGlobal('resourceInputHandler', onSubmit);
		return <Text>Input: {value}</Text>;
	},
}));

// Helper function to wait for state updates
const waitForStateUpdate = () =>
	new Promise(resolve => setTimeout(resolve, 50));

describe('ResourceInput', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		mockGetExistingResources.mockResolvedValue(new Set());
	});

	afterEach(() => {
		cleanup();
	});

	it('should render correctly', () => {
		const { lastFrame } = render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Resource Configuration');
		expect(lastFrame()).toContain('Enter resource keys');
	});

	it('should handle valid input', async () => {
		render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to initialize
		await waitForStateUpdate();

		// Simulate input submission using the stored handler
		if (global.resourceInputHandler) {
			global.resourceInputHandler('users, posts');
		}

		// Wait for the async operation to complete
		await waitForStateUpdate();

		expect(mockOnComplete).toHaveBeenCalled();
		expect(mockOnComplete.mock.calls[0][0]).toEqual([
			{ key: 'users', name: 'users', actions: {} },
			{ key: 'posts', name: 'posts', actions: {} },
		]);
	});

	it('should handle empty input', async () => {
		render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to initialize
		await waitForStateUpdate();

		// Reset mocks
		mockOnError.mockClear();

		// Simulate empty input submission
		if (global.resourceInputHandler) {
			global.resourceInputHandler('   ');
		}

		// Wait for the async operation to complete
		await waitForStateUpdate();

		expect(mockOnError).toHaveBeenCalledWith(
			'Please enter at least one resource',
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should validate resource keys', async () => {
		render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to initialize
		await waitForStateUpdate();

		// Reset mocks
		mockOnError.mockClear();

		// Simulate invalid input submission
		if (global.resourceInputHandler) {
			global.resourceInputHandler('valid, 123invalid');
		}

		// Wait for the async operation to complete
		await waitForStateUpdate();

		expect(mockOnError).toHaveBeenCalledWith(
			'Invalid resource keys: 123invalid',
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should check for existing resources', async () => {
		// Set up mock to return existing resources for this test only
		mockGetExistingResources.mockResolvedValue(new Set(['users']));

		render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to initialize
		await waitForStateUpdate();

		// Reset mocks
		mockOnError.mockClear();

		// Simulate input with existing resource
		if (global.resourceInputHandler) {
			global.resourceInputHandler('users, posts');
		}

		// Wait for the async operation to complete
		await waitForStateUpdate();

		expect(mockOnError).toHaveBeenCalledWith('Resources already exist: users');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should handle API errors', async () => {
		// Set up mock to simulate an API error
		mockGetExistingResources.mockRejectedValue(new Error('API error'));

		render(
			<ResourceInput
				projectId="proj123"
				environmentId="env123"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to initialize
		await waitForStateUpdate();

		// Reset mocks
		mockOnError.mockClear();

		// Simulate input submission that will trigger API call
		if (global.resourceInputHandler) {
			global.resourceInputHandler('users');
		}

		// Wait for the async operation to complete
		await waitForStateUpdate();

		expect(mockOnError).toHaveBeenCalledWith('API error');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});
});

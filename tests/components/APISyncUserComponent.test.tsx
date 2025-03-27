import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import APISyncUserComponent from '../../source/components/api/sync/APISyncUserComponent.js';
import delay from 'delay';
import type { Mock } from 'vitest';

// Define types for mocks
type PUTResponse = { response: { status: number } };
type MockPUT = Mock<(...args: any[]) => Promise<PUTResponse>> & {
	lastApiKey?: string | null;
};

// Mocks for dependencies
let mockPUT: MockPUT;
let mockValidate: Mock<(...args: any[]) => boolean>;
let mockAuthScope: { project_id: string; environment_id: string } = {
	project_id: 'test_project',
	environment_id: 'test_env',
};

// Set up mocks before importing the component
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({
			PUT: (...args: any[]) => mockPUT(...args),
		}),
		unAuthenticatedApiClient: (apiKey: string) => ({
			PUT: (...args: any[]) => {
				mockPUT.lastApiKey = apiKey;
				return mockPUT(...args);
			},
		}),
	}),
}));

// Mock the AuthProvider module
vi.mock('../../source/components/AuthProvider.js', () => ({
	useAuth: () => ({ scope: mockAuthScope }),
	AuthContext: {
		Provider: ({ children }: { children: React.ReactNode }) => children,
	},
}));

// Define the interface expected by the validate function
interface UserSyncOptions {
	key: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	attributes?: Record<string, unknown>;
	roleAssignments?: Array<{ role: string; tenant?: string }>;
}

// Mock the validation function - ensure it runs synchronously
vi.mock('../../source/utils/api/user/utils.js', () => ({
	validate: (...args: [UserSyncOptions]) => mockValidate(...args),
}));

// Default options
const defaultOptions = {
	userid: '',
	email: '',
	firstName: '',
	lastName: '',
	attributes: '{}',
	roleAssignments: [],
};

// Set longer timeout for tests
vi.setConfig({ testTimeout: 10000 });

describe('APISyncUserComponent', () => {
	// Setup before each test
	beforeEach(() => {
		vi.clearAllMocks();

		// Make sure PUT response resolves immediately to prevent hanging
		mockPUT = vi.fn().mockImplementation(() => {
			return Promise.resolve({ response: { status: 200 } });
		}) as MockPUT;

		mockPUT.lastApiKey = null;
		mockValidate = vi.fn().mockReturnValue(true); // Always return true by default
		mockAuthScope = { project_id: 'test_project', environment_id: 'test_env' };
	});

	// Cleanup after each test
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Test 1: Simple input prompt test
	it('renders input prompt when userId is not provided', async () => {
		const { lastFrame } = render(
			<APISyncUserComponent options={defaultOptions} />,
		);

		// Wait for the component to stabilize
		await delay(200);

		// Check that the prompt is shown
		const output = lastFrame();
		expect(output).toContain('UserID is required. Please enter it:');
	});

	// Test 2: Success case with mocked API
	it('shows success message after API call completes', async () => {
		// Ensure mockPUT resolves immediately
		mockPUT.mockResolvedValueOnce({ response: { status: 200 } });

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'test-user', // Provide userId to skip input state
				}}
			/>,
		);

		// Give it enough time to process
		await delay(500);

		// Check for success message
		expect(lastFrame()).toContain('User Synced Successfully!');
		expect(mockPUT).toHaveBeenCalledTimes(1);
	});

	// Test 3: Error handling when API fails
	it('displays error message when API call fails', async () => {
		// IMPORTANT: Reset mockPUT completely
		mockPUT = vi.fn() as MockPUT;

		// Set up the mock to throw an error
		mockPUT.mockImplementation(() => {
			throw new Error('Network Error');
		});

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'error-user',
				}}
			/>,
		);

		// Give it enough time to process the error
		await delay(500);

		// Output for debugging
		console.log('Last frame content (error case):', lastFrame());

		// Check for error message
		expect(lastFrame()).toContain('Error: Network Error');
	});

	// Test 4: Validation error handling
	it('displays error when validation fails', async () => {
		// Force validation to throw an error
		mockValidate.mockImplementationOnce(() => {
			throw new Error('Validation failed');
		});

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'invalid-user',
				}}
			/>,
		);

		// Wait for error processing
		await delay(500);

		// Check for error message
		expect(lastFrame()).toContain('Error: Validation failed');
	});

	// Test 5: Test 422 status code error handling
	it('displays validation error when API returns 422', async () => {
		// Replace the entire mockPUT implementation for this test
		mockPUT = vi.fn().mockResolvedValue({
			response: { status: 422 },
		}) as MockPUT;

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'invalid-user-422',
				}}
			/>,
		);

		// Wait for error processing
		await delay(500);

		// Debug output
		console.log('Last frame content (422 error):', lastFrame());

		// Check for validation error message
		expect(lastFrame()).toContain('Error: Validation Error: Invalid user ID');
	});
});

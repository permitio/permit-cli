import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import APISyncUserComponent from '../../source/components/api/sync/APISyncUserComponent.js';
import delay from 'delay';
import type { Mock } from 'vitest';

// Define types for mocks
type PUTResponse = {
	response: { status: number };
	error?: string | object;
};
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
	UserSyncOptions: {},
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

// Define a custom interface for ink-testing-library result

// Helper function to interact with text inputs
// Helper function to interact with text inputs
const typeAndSubmit = async (
	instance: ReturnType<typeof render>,
	text: string,
) => {
	for (const char of text.split('')) {
		instance.stdin.write(char);
		await delay(10);
	}
	instance.stdin.write('\r'); // Enter key
};

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

	// Test 3: Error handling when API fails with Error object
	it('displays error message when API call fails with Error object', async () => {
		// Create a new mock function that throws an error
		const errorMock = vi.fn().mockImplementation(() => {
			throw new Error('Network Error');
		});

		// Replace the mockPUT implementation for this test only
		vi.mocked(mockPUT).mockImplementation(errorMock);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'error-user',
				}}
			/>,
		);

		// Give it enough time to process the error
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain('Error: Network Error');
	});

	// Test 4: Error handling when API fails with structured error object
	it('displays error message when API call fails with structured error object', async () => {
		// Create a new mock function that throws a structured error
		const errorMock = vi.fn().mockImplementation(() => {
			throw { error: 'Structured Error Message' };
		});

		// Replace the mockPUT implementation for this test only
		vi.mocked(mockPUT).mockImplementation(errorMock);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'error-user-structured',
				}}
			/>,
		);

		// Give it enough time to process the error
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain('Error: Structured Error Message');
	});

	// Test 5: Error handling when API fails with nested JSON error
	it('displays error message when API call fails with nested JSON error', async () => {
		// Create a new mock function that throws an error with JSON string
		const errorMock = vi.fn().mockImplementation(() => {
			throw { error: JSON.stringify({ message: 'Nested JSON Error' }) };
		});

		// Replace the mockPUT implementation for this test only
		vi.mocked(mockPUT).mockImplementation(errorMock);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'error-user-json',
				}}
			/>,
		);

		// Give it enough time to process the error
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain('Error: Nested JSON Error');
	});

	// Test 6: Validation error handling
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
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain('Error: Validation failed');
	});

	// Test 7: Validation error handling - validation returns false
	it('displays error when validation returns false', async () => {
		// Force validation to return false
		mockValidate.mockReturnValueOnce(false);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'invalid-user-false',
				}}
			/>,
		);

		// Wait for error processing
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain('Error: Validation Error: Invalid user ID');
	});

	// Test 8: Test 422 status code error handling
	it('displays validation error when API returns 422', async () => {
		// Create a new mock that returns a 422 status with a properly formatted message
		const mock422 = vi.fn().mockResolvedValue({
			response: { status: 422 },
			error: { message: [{ msg: 'Invalid user data' }] }, // Changed from stringified JSON to direct object
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mock422);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'invalid-user-422',
				}}
			/>,
		);

		// Wait longer for error processing
		await delay(1000);

		// Check for validation error message
		expect(lastFrame()).toContain('Error: Validation Error: Invalid user data');
	});
	// Test 9: Test 422 status code with error array
	it('displays validation error when API returns 422 with error array', async () => {
		// Create a new mock that returns a 422 status with array error format
		const mock422Array = vi.fn().mockResolvedValue({
			response: { status: 422 },
			error: JSON.stringify({
				message: [{ msg: 'Field x is required' }],
			}),
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mock422Array);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'invalid-user-422-array',
				}}
			/>,
		);

		// Wait longer for error processing
		await delay(1000);

		// Check for validation error message with extracted field error
		expect(lastFrame()).toContain(
			'Error: Validation Error: Field x is required',
		);
	});

	// Test 10: Test other non-200 status code error handling
	it('displays error message for non-200 status codes', async () => {
		// Create a new mock that returns a 403 status
		const mock403 = vi.fn().mockResolvedValue({
			response: { status: 403 },
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mock403);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'forbidden-user',
				}}
			/>,
		);

		// Wait for error processing
		await delay(800);

		// Check for error message
		expect(lastFrame()).toContain(
			'Error: API Error: Unexpected status code 403',
		);
	});

	// Test 11: Test error response with error object
	it('displays error message when API returns error object in response', async () => {
		// Create a new mock that returns a 200 status but with error object
		const mockErrorObj = vi.fn().mockResolvedValue({
			response: { status: 200 },
			error: { message: 'Operation succeeded with warnings' },
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mockErrorObj);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'warning-user',
				}}
			/>,
		);

		// Wait for error processing
		await delay(800);

		// Check for warning message
		expect(lastFrame()).toContain('Error: Operation succeeded with warnings');
	});

	// Test 12: Test with API key
	it('uses API key when provided', async () => {
		// Ensure mockPUT resolves immediately
		mockPUT.mockResolvedValueOnce({ response: { status: 200 } });

		render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'test-user-with-key',
					apiKey: 'test-api-key',
				}}
			/>,
		);

		// Give it enough time to process
		await delay(500);

		// Check that API key was passed to unAuthenticatedApiClient
		expect(mockPUT.lastApiKey).toBe('test-api-key');
	});

	// Test 13: Test JSON parse errors for attributes
	it('displays error when attributes JSON is invalid', async () => {
		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'user-bad-json',
					attributes: '{invalid json}',
				}}
			/>,
		);

		// Wait for error processing
		await delay(500);

		// Check for JSON parse error
		expect(lastFrame()).toContain('Error: Failed to parse attributes JSON:');
	});

	// Test 14: Test JSON parse errors for role assignments
	it('displays error when role assignments JSON is invalid', async () => {
		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'user-bad-roles',
					roleAssignments: '{invalid json}',
				}}
			/>,
		);

		// Wait for error processing
		await delay(500);

		// Check for JSON parse error
		expect(lastFrame()).toContain(
			'Error: Failed to parse role assignments JSON:',
		);
	});

	// Test 15: Test non-array role assignments
	it('displays error when role assignments is not an array', async () => {
		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'user-non-array-roles',
					roleAssignments: '{"not":"an-array"}',
				}}
			/>,
		);

		// Wait for error processing
		await delay(500);

		// Check for array error
		expect(lastFrame()).toContain(
			'Error: Role assignments must be a JSON array',
		);
	});

	// Test 16: Test tenant not found formatting
	it('formats tenant not found errors', async () => {
		// Create a tenant not found error
		const mockTenantError = vi.fn().mockResolvedValue({
			response: { status: 404 },
			error: JSON.stringify({
				message:
					"The requested data could not be found, we could not find 'Tenant' with the given filters: id='missing-tenant'.",
			}),
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mockTenantError);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'tenant-error-user',
				}}
			/>,
		);

		// Wait for error processing
		await delay(800);

		// Update the expectation to match the formatted error message
		expect(lastFrame()).toContain("Error: Tenant not found: 'missing-tenant'");
	});
	// Test 17: Test input submission
	it('allows entering userId via input when not provided', async () => {
		mockPUT.mockResolvedValueOnce({ response: { status: 200 } });

		const instance = render(<APISyncUserComponent options={defaultOptions} />);

		// Wait for input prompt
		await delay(200);

		// Enter a userId
		await typeAndSubmit(instance, 'input-test-user');

		// Wait for processing
		await delay(800);

		// Check that the success message is shown
		expect(instance.lastFrame()).toContain('User Synced Successfully!');

		// Check that API was called with the entered userId
		expect(mockPUT).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				user_id: 'input-test-user',
			}),
			expect.objectContaining({
				key: 'input-test-user',
			}),
			undefined,
		);
	});

	// Test 18: Test empty input submission
	it('does not submit empty userId', async () => {
		const instance = render(<APISyncUserComponent options={defaultOptions} />);

		// Wait for input prompt
		await delay(200);

		// Submit empty input
		instance.stdin.write('\r'); // Enter key with no text

		// Wait a bit
		await delay(200);

		// Should still be in input state
		expect(instance.lastFrame()).toContain(
			'UserID is required. Please enter it:',
		);
		expect(mockPUT).not.toHaveBeenCalled();
	});

	// Test 19: Test retry with a different userId
	it('updates userId when payload key changes', async () => {
		// Use a single mock that we can track
		mockPUT.mockClear();

		// Create a component with initial userId
		const { unmount } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'initial-user',
				}}
			/>,
		);

		// Wait for the first call to complete
		await delay(500);

		// Verify first call happened
		expect(mockPUT).toHaveBeenCalledTimes(1);
		expect(mockPUT).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({
				user_id: 'initial-user',
			}),
			expect.anything(),
			undefined,
		);

		// Unmount the first component
		unmount();

		// Clear the mock to start fresh
		mockPUT.mockClear();

		// Mount a new component with a different userId
		render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'changed-user',
				}}
			/>,
		);

		// Wait for the second call to complete
		await delay(500);

		// Verify the second call happened
		expect(mockPUT).toHaveBeenCalledTimes(1);
		expect(mockPUT).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({
				user_id: 'changed-user',
			}),
			expect.anything(),
			undefined,
		);
	});
	// Test 20: Test when error object can't be parsed as JSON
	it('handles unparseable error objects', async () => {
		// Create a mock that returns an error that can't be parsed
		const mockUnparseableError = vi.fn().mockResolvedValue({
			response: { status: 400 },
			error: '{broken json',
		});

		// Override the default mock implementation for this test
		vi.mocked(mockPUT).mockImplementation(mockUnparseableError);

		const { lastFrame } = render(
			<APISyncUserComponent
				options={{
					...defaultOptions,
					userid: 'unparseable-error-user',
				}}
			/>,
		);

		// Wait for error processing
		await delay(800);

		// Check for raw error message
		expect(lastFrame()).toContain('Error: API Error: {broken json');
	});
});

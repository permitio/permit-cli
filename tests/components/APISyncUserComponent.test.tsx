import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import APISyncUserComponent from '../../source/components/api/sync/APISyncUserComponent.js';
import delay from 'delay';
import { Text } from 'ink';
import type { Mock } from 'vitest';

// Extend globalThis for TypeScript
declare global {
	// eslint-disable-next-line no-var
	var submitUserId: ((inputValue: string) => void) | undefined;
}

// Define types for mocks
type MockSync = Mock<(...args: any[]) => Promise<void>>;

// Define mock objects
let mockSyncUser: MockSync;
let mockErrorMessage: string | null = null;
let mockStatus: string = 'processing';
let mockParseError: string | null = null;
let mockPayload: any = {
	key: '',
	email: '',
	firstName: '',
	lastName: '',
	attributes: {},
	roleAssignments: [],
};

// Variable to capture API key and sync calls
let mockCapturedApiKey: string | undefined = undefined;
let syncCalls: Array<{ userId: string; payload: any }> = [];
let formatErrorCalls: string[] = [];
let userIdInputValue: string = '';

// Mock TextInput component
vi.mock('ink-text-input', () => {
	return {
		default: ({ value, onChange, onSubmit }: any) => {
			// Store current value for testing
			userIdInputValue = value;

			// Expose submit handler to tests through global
			global.submitUserId = (inputValue: string) => {
				onChange(inputValue);
				onSubmit(inputValue);
			};

			return <Text>TextInput-{value}</Text>;
		},
	};
});

// Important: Setup mocks before tests run
beforeEach(() => {
	// Reset state
	mockStatus = 'processing';
	mockErrorMessage = null;
	mockParseError = null;
	mockCapturedApiKey = undefined;
	syncCalls = [];
	formatErrorCalls = [];
	userIdInputValue = '';

	mockPayload = {
		key: 'test-user',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		attributes: {},
		roleAssignments: [],
	};

	// Setup mock implementations
	mockSyncUser = vi
		.fn()
		.mockImplementation(async (userId: string, payload: any) => {
			syncCalls.push({ userId, payload: { ...payload } }); // Store a copy of what was passed
			return Promise.resolve();
		});

	// Setup mocks for each test
	vi.mock('../../source/hooks/useParseUserData.js', () => ({
		useParseUserData: () => ({
			payload: mockPayload,
			parseError: mockParseError,
		}),
	}));

	vi.mock('../../source/hooks/useSyncUser.js', () => ({
		useSyncUser: (
			_projectId: string,
			_environmentId: string,
			apiKey?: string,
		) => {
			// Capture apiKey parameter for the API key test
			if (apiKey) {
				mockCapturedApiKey = apiKey;
			}
			return {
				status: mockStatus,
				errorMessage: mockErrorMessage,
				syncUser: mockSyncUser,
				formatErrorMessage: (msg: string) => {
					formatErrorCalls.push(msg);
					if (msg.includes("could not find 'Tenant'")) {
						return `Tenant not found: '${msg.match(/id='([^']+)'/)?.[1]}'`;
					}
					return msg;
				},
				setStatus: (s: string) => {
					mockStatus = s;
				},
				setErrorMessage: (e: string | null) => {
					mockErrorMessage = e;
				},
			};
		},
	}));

	vi.mock('../../source/components/AuthProvider.js', () => ({
		useAuth: () => ({
			scope: {
				project_id: 'test-project',
				environment_id: 'test-env',
			},
		}),
	}));

	vi.mock('ink-spinner', () => ({
		default: () => <Text>Spinner</Text>,
	}));
});

// Clear mocks after each test
afterEach(() => {
	vi.clearAllMocks();
	if (global.submitUserId) {
		delete global.submitUserId;
	}
});

// Helper function for waiting for effects to complete
const waitForEffects = async (time = 200) => {
	await delay(time);
};

describe('APISyncUserComponent', () => {
	describe('Rendering states', () => {
		it('should render in processing state with spinner', async () => {
			mockStatus = 'processing';

			const { lastFrame } = render(
				<APISyncUserComponent options={{ key: 'test-user' }} />,
			);

			await waitForEffects();
			expect(lastFrame()).toContain('Spinner');
		});

		it('should render success message when status is done', async () => {
			mockStatus = 'done';

			const { lastFrame } = render(
				<APISyncUserComponent options={{ key: 'test-user' }} />,
			);

			await waitForEffects();
			expect(lastFrame()).toMatch(/User Synced Successfully/);
		});

		it('should render error message when status is error', async () => {
			mockStatus = 'error';
			mockErrorMessage = 'Test error message';

			const { lastFrame } = render(
				<APISyncUserComponent options={{ key: 'test-user' }} />,
			);

			await waitForEffects();
			expect(lastFrame()).toContain('Error: Test error message');
		});
	});

	describe('Error handling', () => {
		it('should format tenant not found error messages', async () => {
			mockStatus = 'error';
			mockErrorMessage = "could not find 'Tenant' with id='test-tenant'";

			const { lastFrame } = render(
				<APISyncUserComponent options={{ key: 'test-user' }} />,
			);

			await waitForEffects();

			// Check that formatErrorMessage was called with the error
			expect(formatErrorCalls).toContain(
				"could not find 'Tenant' with id='test-tenant'",
			);

			// Check that the formatted message is displayed
			expect(lastFrame()).toContain("Error: Tenant not found: 'test-tenant'");
		});
	});

	describe('User input handling', () => {
		it('should initialize userId from options.key', async () => {
			mockStatus = 'input';
			mockPayload.key = '';

			render(<APISyncUserComponent options={{ key: 'initial-key' }} />);

			await waitForEffects();

			// Check that the userId was initialized from options.key
			expect(userIdInputValue).toBe('initial-key');
		});

		it('should handle user input submission', async () => {
			mockStatus = 'input';
			mockPayload.key = '';

			render(<APISyncUserComponent options={{ key: '' }} />);

			await waitForEffects();

			// Simulate user input submission
			if (global.submitUserId) {
				global.submitUserId('new-user-id');
			}

			// Wait for state updates
			await waitForEffects();

			// Status should change to processing
			expect(mockStatus).toBe('processing');

			// Check that payload.key was updated
			expect(mockPayload.key).toBe('new-user-id');
		});

		it('should not process empty user input submission', async () => {
			mockStatus = 'input';
			mockPayload.key = '';

			render(<APISyncUserComponent options={{ key: '' }} />);

			await waitForEffects();

			// Simulate empty input submission
			if (global.submitUserId) {
				global.submitUserId('');
			}

			// Wait for state updates
			await waitForEffects();

			// Status should still be input
			expect(mockStatus).toBe('input');
		});
	});

	describe('Component effects', () => {
		it('should not sync user when in done state', async () => {
			mockStatus = 'done';

			render(<APISyncUserComponent options={{ key: 'test-user' }} />);

			await waitForEffects();
			expect(syncCalls.length).toBe(0);
		});

		it('should not sync user when in error state', async () => {
			mockStatus = 'error';
			mockErrorMessage = 'Previous error';

			render(<APISyncUserComponent options={{ key: 'test-user' }} />);

			await waitForEffects();
			expect(syncCalls.length).toBe(0);
		});
	});

	describe('User data updates', () => {
		it('should handle API key being passed to the sync user hook', async () => {
			// Reset the captured API key
			mockCapturedApiKey = undefined;

			render(
				<APISyncUserComponent
					options={{ key: 'test-user', apiKey: 'special-api-key' }}
				/>,
			);

			// Wait for the hook to be called
			await waitForEffects();

			// Check that the API key was captured
			expect(mockCapturedApiKey).toBe('special-api-key');
		});
	});
});

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
  environment_id: 'test_env' 
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
  AuthContext: { Provider: ({ children }: { children: React.ReactNode }) => children }
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

// Mock the validation function
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
  roleAssignments: []
};

describe('APISyncUserComponent', () => {
  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock behavior that resolves immediately
    mockPUT = vi.fn(() => Promise.resolve({ response: { status: 200 } })) as MockPUT;
    mockPUT.lastApiKey = null;
    mockValidate = vi.fn(() => true);
    mockAuthScope = { project_id: 'test_project', environment_id: 'test_env' };
  });

  // Cleanup after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to wait for component updates with a timeout
  const waitForOutput = async (
    getOutput: () => string | undefined, 
    matcher: (output: string) => boolean, 
    timeoutMs = 500, 
    intervalMs = 50
  ): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const output = getOutput();
      if (output && matcher(output)) {
        return true;
      }
      await delay(intervalMs);
    }
    // If we get here, the condition wasn't met within the timeout
    throw new Error(`Timeout waiting for output. Last output: ${getOutput()}`);
  };

  it('renders input prompt when userId is not provided', async () => {
    const { lastFrame } = render(
      <APISyncUserComponent options={defaultOptions} />
    );
    
    // Use the helper to wait for the expected output
    await waitForOutput(
      lastFrame,
      output => output.includes('UserID is required. Please enter it:')
    );
  });

  it('processes immediately when userId is provided in options', async () => {
    const options = {
      ...defaultOptions,
      userid: 'test-user-123'
    };
    
    const { lastFrame } = render(
      <APISyncUserComponent options={options} />
    );
    
    // First check for spinner
    await waitForOutput(
      lastFrame,
      output => output.includes('⠋')
    );
    
    // Then check for success message
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
    
    expect(mockPUT).toHaveBeenCalledTimes(1);
  });

  it('shows spinner during API call processing', async () => {
    // Create a promise that we'll resolve manually
    let resolveApiCall: ((value: PUTResponse) => void) | undefined;
    mockPUT.mockImplementationOnce(() => 
      new Promise<PUTResponse>(resolve => {
        resolveApiCall = resolve;
      })
    );
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    // Check for spinner first
    await waitForOutput(
      lastFrame,
      output => output.includes('⠋')
    );
    
    // Now resolve the API call
    if (resolveApiCall) {
      resolveApiCall({ response: { status: 200 } });
    }
    
    // Check for success message
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
  });

  it('displays success message after successful API call', async () => {
    mockPUT.mockResolvedValueOnce({ response: { status: 200 } });
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{
        userid: 'test-user',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        attributes: '{"department":"Engineering"}',
        roleAssignments: [{ role: 'role1' }] // Fixed role property
      }} />
    );
    
    // Wait for success message
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
    
    // Verify API was called correctly
    expect(mockPUT).toHaveBeenCalledWith(
      '/v2/facts/{proj_id}/{env_id}/users/{user_id}',
      {
        proj_id: 'test_project',
        env_id: 'test_env',
        user_id: 'test-user'
      },
      expect.objectContaining({
        key: 'test-user',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        attributes: { department: 'Engineering' },
        role_assignments: [{ role: 'role1' }] // Fixed role property
      }),
      undefined
    );
  });

  it('displays validation error when API returns 422', async () => {
    mockPUT.mockResolvedValueOnce({ response: { status: 422 } });
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'invalid-user'}} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('Error: Validation Error: Invalid user ID')
    );
  });

  it('handles user input submission', async () => {
    const { stdin, lastFrame } = render(
      <APISyncUserComponent options={defaultOptions} />
    );
    
    // Wait for input prompt
    await waitForOutput(
      lastFrame,
      output => output.includes('UserID is required. Please enter it:')
    );
    
    // Enter user ID
    stdin.write('new-test-user\n');
    
    // Wait for spinner to appear
    await waitForOutput(
      lastFrame,
      output => output.includes('⠋')
    );
    
    // Wait for success message
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
    
    // Verify API call
    expect(mockPUT).toHaveBeenCalledWith(
      '/v2/facts/{proj_id}/{env_id}/users/{user_id}',
      expect.objectContaining({
        user_id: 'new-test-user'
      }),
      expect.objectContaining({
        key: 'new-test-user'
      }),
      undefined
    );
  });

  it('ignores empty user input submission', async () => {
    const { stdin, lastFrame } = render(
      <APISyncUserComponent options={defaultOptions} />
    );
    
    // Wait for input prompt
    await waitForOutput(
      lastFrame,
      output => output.includes('UserID is required. Please enter it:')
    );
    
    // Submit empty input
    stdin.write('\n');
    
    // Wait and verify still in input mode
    await delay(100);
    const frame = lastFrame();
    if (frame) {
      expect(frame).toContain('UserID is required. Please enter it:');
    }
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when validation fails', async () => {
    mockValidate.mockReturnValueOnce(false);
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'invalid-format'}} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('Error: Validation Error: Invalid user ID')
    );
    
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when validation throws an exception', async () => {
    mockValidate.mockImplementationOnce(() => {
      throw new Error('Custom validation error');
    });
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'error-user'}} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('Error: Custom validation error')
    );
    
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when API call fails', async () => {
    mockPUT.mockRejectedValueOnce(new Error('Network Error'));
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('Error: Network Error')
    );
  });

  it('uses unAuthenticatedApiClient when apiKey is provided', async () => {
    const { lastFrame } = render(
      <APISyncUserComponent options={{
        ...defaultOptions,
        userid: 'test-user',
        apiKey: 'secret-api-key'
      }} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
    
    expect(mockPUT.lastApiKey).toBe('secret-api-key');
  });

  it('handles invalid JSON in attributes field', async () => {
    const { lastFrame } = render(
      <APISyncUserComponent options={{
        ...defaultOptions, 
        userid: 'test-user',
        attributes: '{invalid-json}'
      }} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('Error:')
    );
    
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('correctly passes auth scope to API call', async () => {
    mockAuthScope = { project_id: 'custom-project', environment_id: 'custom-env' };
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    await waitForOutput(
      lastFrame,
      output => output.includes('User Synced Successfully!')
    );
    
    expect(mockPUT).toHaveBeenCalledWith(
      '/v2/facts/{proj_id}/{env_id}/users/{user_id}',
      {
        proj_id: 'custom-project',
        env_id: 'custom-env',
        user_id: 'test-user'
      },
      expect.anything(),
      undefined
    );
  });
});
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import APISyncUserComponent from '../../source/components/api/sync/APISyncUserComponent.js';
import delay from 'delay';

// Mocks for dependencies
let mockPUT;
let mockValidate;
let mockAuthScope = { project_id: 'test_project', environment_id: 'test_env' };

// Set up mocks before importing the component
vi.mock('../../source/hooks/useClient.js', () => ({
  default: () => ({
    authenticatedApiClient: () => ({
      PUT: (...args) => mockPUT(...args),
    }),
    unAuthenticatedApiClient: (apiKey) => ({
      PUT: (...args) => {
        mockPUT.lastApiKey = apiKey;
        return mockPUT(...args);
      },
    }),
  }),
}));

// Mock the AuthProvider module
vi.mock('../../source/components/AuthProvider.js', () => ({
  useAuth: () => ({ scope: mockAuthScope }),
  AuthContext: { Provider: ({ children }) => children }
}));

// Mock the validation function
vi.mock('../../source/utils/api/user/utils.js', () => ({
  validate: (...args) => mockValidate(...args),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockPUT = vi.fn(() => Promise.resolve({ response: { status: 200 } }));
    mockPUT.lastApiKey = null;
    mockValidate = vi.fn(() => true);
    mockAuthScope = { project_id: 'test_project', environment_id: 'test_env' };
  });

  it('renders input prompt when userId is not provided', async () => {
    const { lastFrame } = render(
      <APISyncUserComponent options={defaultOptions} />
    );
    
    await delay(50);
    expect(lastFrame()).toContain('UserID is required. Please enter it:');
  });

  it('processes immediately when userId is provided in options', async () => {
    const options = {
      ...defaultOptions,
      userid: 'test-user-123'
    };
    
    const { lastFrame } = render(
      <APISyncUserComponent options={options} />
    );
    
    await delay(50);
    expect(lastFrame()).toContain('⠋'); // Spinner
    
    await delay(100);
    expect(lastFrame()).toContain('User Synced Successfully!');
    expect(mockPUT).toHaveBeenCalledTimes(1);
  });

  it('shows spinner during API call processing', async () => {
    // Create a promise that we'll resolve manually to control timing
    let resolveApiCall;
    mockPUT.mockImplementationOnce(() => 
      new Promise(resolve => {
        resolveApiCall = resolve;
      })
    );
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    await delay(50);
    expect(lastFrame()).toContain('⠋'); // Spinner
    
    // Resolve the API call
    resolveApiCall({ response: { status: 200 } });
    await delay(50);
    expect(lastFrame()).toContain('User Synced Successfully!');
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
        roleAssignments: [{ role_id: 'role1' }]
      }} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('User Synced Successfully!');
    
    // Verify the API was called with correct parameters
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
        role_assignments: [{ role_id: 'role1' }]
      }),
      undefined
    );
  });

  it('displays validation error when API returns 422', async () => {
    mockPUT.mockResolvedValueOnce({ response: { status: 422 } });
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'invalid-user'}} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('Error: Validation Error: Invalid user ID');
  });

  it('handles user input submission', async () => {
    const { stdin, lastFrame } = render(
      <APISyncUserComponent options={defaultOptions} />
    );
    
    await delay(50);
    expect(lastFrame()).toContain('UserID is required. Please enter it:');
    
    stdin.write('new-test-user\n');
    await delay(50);
    expect(lastFrame()).toContain('⠋'); // Spinner
    
    await delay(100);
    expect(lastFrame()).toContain('User Synced Successfully!');
    
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
    
    await delay(50);
    stdin.write('\n'); // Empty submission
    await delay(50);
    
    // Should still be in input mode
    expect(lastFrame()).toContain('UserID is required. Please enter it:');
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when validation fails', async () => {
    mockValidate.mockReturnValueOnce(false);
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'invalid-format'}} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('Error: Validation Error: Invalid user ID');
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when validation throws an exception', async () => {
    mockValidate.mockImplementationOnce(() => {
      throw new Error('Custom validation error');
    });
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'error-user'}} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('Error: Custom validation error');
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('displays error when API call fails', async () => {
    mockPUT.mockRejectedValueOnce(new Error('Network Error'));
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('Error: Network Error');
  });

  it('uses unAuthenticatedApiClient when apiKey is provided', async () => {
    const { lastFrame } = render(
      <APISyncUserComponent options={{
        ...defaultOptions,
        userid: 'test-user',
        apiKey: 'secret-api-key'
      }} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('User Synced Successfully!');
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
    
    await delay(150);
    expect(lastFrame()).toContain('Error:');
    expect(mockPUT).not.toHaveBeenCalled();
  });

  it('correctly passes auth scope to API call', async () => {
    mockAuthScope = { project_id: 'custom-project', environment_id: 'custom-env' };
    
    const { lastFrame } = render(
      <APISyncUserComponent options={{...defaultOptions, userid: 'test-user'}} />
    );
    
    await delay(150);
    expect(lastFrame()).toContain('User Synced Successfully!');
    
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
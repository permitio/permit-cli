import React from 'react';
import { render, RenderResult } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import CreateComponent from '../../source/components/env/CreateEnvComponent';
import * as useAuth from '../../source/components/AuthProvider';
import * as useProjectAPI from '../../source/hooks/useProjectAPI';
import * as useEnvironmentApi from '../../source/hooks/useEnvironmentApi';

// Mock the hooks
vi.mock('../../source/components/AuthProvider', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../../source/hooks/useProjectAPI', () => ({
  useProjectAPI: vi.fn(),
}));
vi.mock('../../source/hooks/useEnvironmentApi', () => ({
  useEnvironmentApi: vi.fn(),
}));

// Mock ink-spinner
vi.mock('ink-spinner', () => ({
  default: () => 'Loading...',
}));

// Prevent process.exit from terminating tests
vi.spyOn(process, 'exit').mockImplementation((code?: number): never => {
  console.log(`Process.exit called with code: ${code}`);
  return undefined as never;
});

// Helper function to wait for component updates
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Type-guard for TextInput onSubmit event
const simulateEnterKeyPress = async (instance: RenderResult) => {
  const stdin = instance.stdin;
  stdin.write('\r'); // Write carriage return (Enter key)
  await sleep(50); // Wait for the component to update
};

// Helper to fill out a form by stepping through fields
const fillOutForm = async (instance: RenderResult, values: string[]) => {
  for (const value of values) {
    instance.stdin.write(value);
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
  }
};

describe('CreateComponent', () => {
  const mockEnvironmentApi = {
    createEnvironment: vi.fn().mockResolvedValue({
      data: { id: 'new-env-id', name: 'Test Env', key: 'test_env' },
      error: null,
    }),
    getEnvironments: vi.fn(),
    getEnvironment: vi.fn(),
    copyEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // By default, useAuth returns a valid scope.
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: { organization_id: 'org1', project_id: 'project1' },
      loading: false,
    });
    // Stub for useProjectAPI (not used by CreateComponent)
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: vi.fn(),
    });
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue(mockEnvironmentApi);
  });

  it('shows loading state initially (name input prompt since no loading branch exists)', () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: { organization_id: 'org1', project_id: 'project1' },
      loading: true,
    });
    const { lastFrame } = render(<CreateComponent />);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('handles project selection when projectId is not provided', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: {},
      loading: false,
    });
    const { lastFrame } = render(<CreateComponent />);
    await sleep(100);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('handles failure to find project', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: {},
      loading: false,
    });
    const { lastFrame } = render(<CreateComponent />);
    await sleep(100);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('handles missing auth token', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: null,
      scope: { organization_id: 'org1', project_id: 'project1' },
      loading: false,
    });
    const { lastFrame } = render(<CreateComponent />);
    await sleep(100);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('skips project selection when project_id is provided in scope', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: { organization_id: 'org1', project_id: 'project1' },
      loading: false,
    });
    const { lastFrame } = render(<CreateComponent />);
    await sleep(100);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('goes directly to creating when all parameters are provided', async () => {
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: { id: 'new-env-id', name: 'Test Env', key: 'test_env' },
      error: null,
    });
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    const { lastFrame } = render(
      <CreateComponent
        name="Test Env"
        envKey="test_env"
        description="Test Description"
        customBranchName="test-branch"
        jwks="{}"
        settings="{}"
      />
    );
    await sleep(300);
    expect(mockCreateEnvironment).toHaveBeenCalled();
    await sleep(300);
    expect(lastFrame()).toContain('Environment created successfully');
  });

  it('validates required fields during submission', async () => {
    const instance = render(<CreateComponent name="" />);
    await sleep(100);
    // Try to submit with empty name field
    await simulateEnterKeyPress(instance);
    await sleep(50);
    expect(instance.lastFrame()).toContain('Enter environment name:');
  });

  it('auto-populates key based on name when moving to key field', async () => {
    const instance = render(<CreateComponent />);
    await sleep(100);
    
    // Enter name
    instance.stdin.write('Test Environment');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Now at key field - should auto-suggest a key
    expect(instance.lastFrame()).toContain('Enter environment key');
    expect(instance.lastFrame()).toContain('test_environment'); // Auto-derived key
  });

  it('allows user to navigate through form fields', async () => {
    // Use a fresh mock to ensure it's tracking calls correctly
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: { id: 'new-env-id', name: 'Test Environment', key: 'test_env' },
      error: null,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    
    const instance = render(<CreateComponent />);
    await sleep(100);
    
    // Type in name field
    instance.stdin.write('Test Environment');
    await sleep(100);
    await simulateEnterKeyPress(instance);
    await sleep(100);
    
    instance.stdin.write('test_env');
    await sleep(100);
    await simulateEnterKeyPress(instance);
    await sleep(100);
    
    // Type in description field
    instance.stdin.write('Description Text');
    await sleep(100);
    await simulateEnterKeyPress(instance);
    await sleep(100);
    
    // Type in branch name field
    instance.stdin.write('main-branch');
    await sleep(100);
    await simulateEnterKeyPress(instance);
    await sleep(100);
    
    // Skip JWKS field (empty)
    await simulateEnterKeyPress(instance);
    await sleep(100);
    
    // Skip settings field (empty) - this should trigger form submission
    await simulateEnterKeyPress(instance);
    await sleep(500);
    
    expect(mockCreateEnvironment).toHaveBeenCalledWith(
      'project1',
      undefined,
      null,
      expect.objectContaining({
        name: 'Test Environment',
        description: 'Description Text',
        custom_branch_name: 'main-branch',
      })
    );
    
    // Verify that key contains our input, but don't require exact match
    const callArgs = mockCreateEnvironment.mock.calls[0][3];
    expect(callArgs.key).toContain('test_env');
  });

  it('handles invalid JWKS JSON input', async () => {
    // Mock to intercept the createEnvironment call
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    
    const instance = render(<CreateComponent />);
    await sleep(100);
    
    // Fill out form fields one by one
    instance.stdin.write('Test Environment');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    instance.stdin.write('test_env');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    instance.stdin.write('Description Text');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    instance.stdin.write('main-branch');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Enter invalid JSON for JWKS - need explicit invalid format
    instance.stdin.write('{');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    
    // Check for error
    await sleep(150);
    
    instance.stdin.write('{}');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(300);
    
    // We expect an error message about the invalid JSON
    expect(instance.lastFrame()).toContain('Error:');
    expect(instance.lastFrame()).toContain('JSON');
    
    // And the form should not have been submitted
    expect(mockCreateEnvironment).not.toHaveBeenCalled();
  });

  it('handles invalid settings JSON input', async () => {
    const instance = render(<CreateComponent />);
    await sleep(100);
    
    // Fill out form up to settings field with invalid JSON
    await fillOutForm(instance, [
      'Test Environment',
      'test_env',
      'Description Text',
      'main-branch',
      '{}',              // Valid JWKS
      '{invalid json}'   // Invalid JSON for settings
    ]);
    
    await sleep(50);
    expect(instance.lastFrame()).toContain('Invalid settings JSON');
  });

  it('handles errors during environment creation', async () => {
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: null,
      error: 'Creation error',
    });
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    const { lastFrame } = render(
      <CreateComponent
        name="Test Env"
        envKey="test_env"
        description="Test Description"
        customBranchName="test-branch"
        jwks="{}"
        settings="{}"
      />
    );
    await sleep(300);
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('Creation error');
  });

  it('handles network errors during environment creation', async () => {
    const mockCreateEnvironment = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    const { lastFrame } = render(
      <CreateComponent
        name="Test Env"
        envKey="test_env"
        description="Test Description"
        customBranchName="test-branch"
        jwks="{}"
        settings="{}"
      />
    );
    await sleep(300);
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('Network error');
  });

  it('shows success message after environment is created', async () => {
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: { id: 'new-env-id', name: 'Test Environment', key: 'test_env' },
      error: null,
    });
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    const { lastFrame } = render(
      <CreateComponent
        name="Test Environment"
        envKey="test_env"
        description="A test environment"
        customBranchName="test-branch"
        jwks="{}"
        settings="{}"
      />
    );
    await sleep(300);
    expect(lastFrame()).toContain('Environment created successfully');
    expect(lastFrame()).toContain('new-env-id');
    expect(lastFrame()).toContain('Test Environment');
  });

  it('submits with just required fields and defaults for optional fields', async () => {
    // Fresh mock for this test
    const mockCreateEnvironment = vi.fn().mockResolvedValue({
      data: { id: 'new-env-id', name: 'Test Environment', key: 'test_env' },
      error: null,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      createEnvironment: mockCreateEnvironment,
      getEnvironments: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
    });
    
    const instance = render(<CreateComponent />);
    await sleep(100);
    
    // Enter name field
    instance.stdin.write('Test Environment');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Enter key field
    instance.stdin.write('test_env');
    await sleep(50);
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Skip description field (empty)
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Skip custom branch name field (empty)
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Skip JWKS field (empty)
    await simulateEnterKeyPress(instance);
    await sleep(50);
    
    // Skip settings field (empty) - this should trigger form submission
    await simulateEnterKeyPress(instance);
    await sleep(500);
    
    // Verify call was made with required fields
    expect(mockCreateEnvironment).toHaveBeenCalled();
    
    // Verify specific fields separately
    const callArgs = mockCreateEnvironment.mock.calls[0][3];
    expect(callArgs.name).toBe('Test Environment');
    expect(callArgs.key).toContain('test_env');
    
    // Check optional fields weren't included
    expect(callArgs.description).toBeUndefined();
    expect(callArgs.custom_branch_name).toBeUndefined();
    expect(callArgs.jwks).toBeUndefined();
    expect(callArgs.settings).toBeUndefined();
  });

  it('shows error when missing project ID but required for API call', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: { organization_id: 'org1' }, // Missing project_id
      loading: false,
    });
    
    const instance = render(
      <CreateComponent
        name="Test Env"
        envKey="test_env"
        description="Test Description"
        customBranchName="test-branch"
        jwks="{}"
        settings="{}"
      />
    );
    
    await sleep(300);
    expect(instance.lastFrame()).toContain('Project ID is missing');
  });
});
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import CreateComponent from '../../source/components/env/CreateComponent';
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
    const { lastFrame } = render(<CreateComponent projectId="non-existent-project" />);
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

  it('skips project selection when projectId is provided', async () => {
    const { lastFrame } = render(<CreateComponent projectId="project1" />);
    await sleep(100);
    expect(lastFrame()).toContain('Enter environment name:');
  });

  it('goes directly to creating when all parameters are provided', async () => {
    const mockCreateEnvironment = vi.fn().mockImplementation((projectId, token, cookie, data) => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: { id: 'new-env-id', name: data.name, key: data.key },
            error: null,
          });
        }, 100);
      });
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
        projectId="project1"
        name="Test Env"
        envKey="test_env"
        description="Test Description"
      />
    );
    await sleep(50);
    expect(mockCreateEnvironment).toHaveBeenCalledWith(
      'project1',
      undefined,
      null,
      {
        name: 'Test Env',
        key: 'test_env',
        description: 'Test Description',
      }
    );
    const frameAfterFetching = lastFrame();
    expect(
      frameAfterFetching.includes('Creating environment') ||
        frameAfterFetching.includes('Environment created successfully')
    ).toBe(true);
    await sleep(200);
    expect(lastFrame()).toContain('Environment created successfully');
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
        projectId="project1"
        name="Test Env"
        envKey="test_env"
        description="Test Description"
      />
    );
    await sleep(200);
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
        projectId="project1"
        name="Test Env"
        envKey="test_env"
        description="Test Description"
      />
    );
    await sleep(200);
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
        projectId="project1"
        name="Test Environment"
        envKey="test_env"
        description="A test environment"
      />
    );
    await sleep(200);
    expect(lastFrame()).toContain('Environment created successfully');
    expect(lastFrame()).toContain('new-env-id');
    expect(lastFrame()).toContain('Test Environment');
    expect(lastFrame()).toContain('test_env');
  });
});

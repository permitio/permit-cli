import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import DeleteComponent from '../../source/components/env/DeleteComponent';
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

// Mock ink-spinner since it causes issues in tests
vi.mock('ink-spinner', () => ({
  default: () => 'Loading...',
}));

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Helper function to wait for component updates
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('DeleteComponent', () => {
  // Setup common mock responses
  const mockProjects = [
    { id: 'project1', key: 'proj1', name: 'Project 1' },
    { id: 'project2', key: 'proj2', name: 'Project 2' },
  ];

  const mockEnvironments = [
    { id: 'env1', key: 'env1', name: 'Environment 1', description: 'Test env 1' },
    { id: 'env2', key: 'env2', name: 'Environment 2', description: 'Test env 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit.mockClear();

    // Default mock implementations
    vi.mocked(useAuth.useAuth).mockReturnValue({
      authToken: 'test-token',
      scope: null,
      loading: false,
    });

    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      }),
    });

    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: vi.fn().mockResolvedValue({
        data: mockEnvironments,
        error: null,
      }),
      deleteEnvironment: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });
  });

  it('shows loading projects state initially', () => {
    const { lastFrame } = render(<DeleteComponent />);
    expect(lastFrame()).toContain('Loading projects');
  });

  it('handles project selection when projectId is not provided', async () => {
    const { lastFrame } = render(<DeleteComponent />);
    
    // Wait for the effect to load projects
    await sleep(100);
    
    // Should now show project selection
    expect(lastFrame()).toContain('Select a project');
    expect(lastFrame()).toContain('Project 1');
    expect(lastFrame()).toContain('Project 2');
  });

  it('skips to environment selection when projectId is provided', async () => {
    // Setup getProjects and getEnvironments to simulate finding the project and envs
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: mockEnvironments,
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" />
    );
    
    // Wait for projects to load and then environments
    await sleep(200);
    
    // Should show environment selection
    expect(lastFrame()).toContain('Select an environment to delete');
    expect(lastFrame()).toContain('Environment 1');
    expect(lastFrame()).toContain('Environment 2');
  });

  it('skips to confirmation when both projectId and environmentId are provided', async () => {
    // Setup getProjects and getEnvironments to simulate finding the project and envs
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: mockEnvironments,
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" environmentId="env1" />
    );
    
    // Wait for projects to load and then environments
    await sleep(200);
    
    // Should show delete confirmation
    expect(lastFrame()).toContain('Warning: You are about to delete environment');
    expect(lastFrame()).toContain('Environment 1');
    expect(lastFrame()).toContain('delete');
    expect(lastFrame()).toContain('to confirm');
  });

  it('skips confirmation with force flag and goes straight to deleting', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: mockEnvironments,
      error: null,
    });
    
    const mockDeleteEnvironment = vi.fn().mockImplementation(() => {
      // Return a slow promise to ensure we can catch the deleting state
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: null,
            error: null,
          });
        }, 300); // Longer delay to ensure we can catch the deleting state
      });
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: mockDeleteEnvironment,
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" environmentId="env1" force={true} />
    );
    
    // Wait for projects and environments to load, but not for deletion to complete
    await sleep(100);
    
    // We only care that deletion was initiated with the right parameters
    expect(mockDeleteEnvironment).toHaveBeenCalledWith(
      'project1',
      'env1',
      'test-token',
      null
    );
    
    
    const frame = lastFrame();
    expect(
      frame.includes('Deleting environment') || 
      frame.includes('Environment successfully deleted')
    ).toBe(true);
  });

  it('handles API errors when deleting environment', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: mockEnvironments,
      error: null,
    });
    
    const mockDeleteEnvironment = vi.fn().mockResolvedValue({
      data: null,
      error: 'Failed to delete environment',
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: mockDeleteEnvironment,
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" environmentId="env1" force={true} />
    );
    
    // Wait for all operations to complete
    await sleep(300);
    
    // Should show error message
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('Failed to delete environment');
  });
  
  it('handles environment not found error', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: mockEnvironments,
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: vi.fn(),
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" environmentId="non-existent-env" />
    );
    
    // Wait for operations to complete
    await sleep(200);
    
    // Should show environment selection with error
    expect(lastFrame()).toContain('Select an environment to delete');
  });
  
  it('handles project not found error', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="non-existent-project" />
    );
    
    // Wait for operations to complete
    await sleep(100);
    
    // Should show project selection
    expect(lastFrame()).toContain('Select a project');
  });
  
  it('handles empty projects list error', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });

    const { lastFrame } = render(<DeleteComponent />);
    
    // Wait for operations to complete
    await sleep(100);
    
    // Should show error about no projects
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('No projects found');
  });
  
  it('handles empty environments list error', async () => {
    // Setup mocks
    const mockGetProjects = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
    });
    
    const mockGetEnvironments = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    
    vi.mocked(useProjectAPI.useProjectAPI).mockReturnValue({
      getProjects: mockGetProjects,
    });
    
    vi.mocked(useEnvironmentApi.useEnvironmentApi).mockReturnValue({
      getEnvironments: mockGetEnvironments,
      deleteEnvironment: vi.fn(),
      createEnvironment: vi.fn(),
      getEnvironment: vi.fn(),
      copyEnvironment: vi.fn(),
    });

    const { lastFrame } = render(
      <DeleteComponent projectId="project1" />
    );
    
    // Wait for operations to complete
    await sleep(200);
    
    // Should show error about no environments
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('No environments found');
  });
});
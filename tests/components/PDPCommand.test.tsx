import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import delay from 'delay';
import { loadAuthToken } from '../../source/lib/auth';
import Run from '../../source/commands/pdp/run';

// Mock child_process.exec
vi.mock('node:child_process', () => ({
  exec: vi.fn()
}));

// Mock util.promisify
vi.mock('node:util', () => ({
  promisify: vi.fn().mockImplementation((fn) => {
    return async () => ({ stdout: 'container123\n' });
  })
}));

// Mock the auth module
vi.mock('../../source/lib/auth', () => ({
  loadAuthToken: vi.fn()
}));

// Mock the API key hooks
vi.mock('../../source/hooks/useApiKeyApi', async() => {
  const original = await vi.importActual('../../source/hooks/useApiKeyApi');
  return {
    ...original,
    useApiKeyApi: () => ({
      getApiKeyScope: vi.fn().mockResolvedValue({
        data: {
          environment_id: 'env1',
          project_id: 'proj1',
          organization_id: 'org1',
        },
        error: null,
        status: 200,
      }),
      getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
        data: { secret: 'test-secret' },
        error: null,
      }),
      validateApiKeyScope: vi.fn().mockResolvedValue({
        valid: true,
        scope: {
          environment_id: 'env1',
          project_id: 'proj1',
          organization_id: 'org1',
        },
        error: null,
      }),
    }),
  };
});

// Mock fetch API with controlled timing
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ controlPlane: 'https://api.permit.io' }),
    statusText: 'OK'
  })
);

describe('PDP Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (loadAuthToken as any).mockResolvedValue('permit_key_' + 'a'.repeat(97));
  });

  it('should render the PDP component with auth token in dry run mode', async () => {
    const { lastFrame } = render(<Run options={{ opa: 8181, dryRun: true, apiKey: 'test-key' }} />);
    
    // Only check final state - ignore intermediate loading states
    await delay(1000); // Give more time for all async operations to complete
    
    // Final state should show the Docker command
    const finalOutput = lastFrame()?.toString() || '';
    expect(finalOutput).toContain('Run the following command to start the PDP container');
    expect(finalOutput).toContain('docker run');
  });

  it('should render the PDP component in execution mode', async () => {
    const { lastFrame } = render(<Run options={{ opa: 8181, apiKey: 'test-key' }} />);
    
    // Only check final state - ignore intermediate loading states
    await delay(1000); // Give more time for all async operations to complete
    
    // Final state should show success message
    const finalOutput = lastFrame()?.toString() || '';
    expect(finalOutput).toContain('PDP container started successfully');
    expect(finalOutput).toContain('Container ID:');
  });
});
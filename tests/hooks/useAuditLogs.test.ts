import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditLogs } from '../../source/hooks/useAuditLogs.js';
import { apiCall } from '../../source/lib/api.js';
import { fetchUtil } from '../../source/utils/fetchUtil.js';

// Mock dependencies
vi.mock('../../source/lib/auth.js', () => ({
  loadAuthToken: vi.fn().mockResolvedValue('mock-token')
}));

vi.mock('../../source/lib/api.js', () => ({
  apiCall: vi.fn()
}));

vi.mock('../../source/utils/fetchUtil.js', () => ({
  fetchUtil: vi.fn(),
  MethodE: {
    POST: 'POST',
    GET: 'GET'
  }
}));

// Mock useClient
vi.mock('../../source/hooks/useClient.js', () => ({
  __esModule: true,
  default: () => ({
    authenticatedApiClient: () => ({
      GET: vi.fn().mockResolvedValue({
        data: {
          organization_id: 'org-id',
          project_id: 'proj-id',
          environment_id: 'env-id'
        },
        error: null
      })
    })
  })
}));

// Mock React hooks to allow calling hooks outside of components
vi.mock('react', () => {
  const originalReact = vi.importActual('react');
  return {
    ...originalReact,
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
  };
});

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches audit logs with correct parameters', async () => {
    // Mock API response
    const mockAuditLogs = {
      data: [
        { id: 'log1', timestamp: '2023-01-01', action: 'read', decision: true },
        { id: 'log2', timestamp: '2023-01-02', action: 'write', decision: false }
      ]
    };
    
    // Setup mock for apiCall
    vi.mocked(apiCall).mockResolvedValueOnce({
      response: mockAuditLogs,
      error: null,
      status: 200
    });

    // Use the hook directly
    const { getAuditLogs } = useAuditLogs();
    
    // Call the function with test parameters
    const result = await getAuditLogs({
      timeFrame: 24,
      sourcePdp: 'test-pdp',
      users: ['user1', 'user2'],
      resources: ['resource1'],
      tenant: 'tenant1',
      action: 'read',
      decision: true
    });

    // Verify apiCall was called with correct parameters
    expect(apiCall).toHaveBeenCalled();
    expect(apiCall.mock.calls[0][0]).toContain('v2/pdps/proj-id/env-id/audit_logs');
    expect(apiCall.mock.calls[0][0]).toContain('timestamp_from=');
    expect(apiCall.mock.calls[0][0]).toContain('pdp_id=test-pdp');
    expect(apiCall.mock.calls[0][0]).toContain('users=user1');
    expect(apiCall.mock.calls[0][0]).toContain('users=user2');
    
    // Verify the response was correct
    expect(result).toEqual({ data: mockAuditLogs, error: null });
  });

  it('handles API errors properly', async () => {
    // Setup error response
    vi.mocked(apiCall).mockResolvedValueOnce({
      response: null,
      error: 'Failed to fetch',
      status: 500
    });

    // Use the hook directly
    const { getAuditLogs } = useAuditLogs();
    
    // Call the function
    const result = await getAuditLogs({ timeFrame: 24 });
    
    // Verify error handling
    expect(result.data).toBeNull();
    expect(result.error).toContain('Failed to fetch audit logs: Failed to fetch');
  });

  it('fetches detailed audit log by ID', async () => {
    // Mock API response
    const mockDetailedLog = {
      id: 'log1',
      timestamp: '2023-01-01',
      action: 'read',
      decision: true,
      user_key: 'user1',
      resource: 'resource1',
      context: { user: { id: 'user1' }, resource: { type: 'doc' } }
    };
    
    vi.mocked(apiCall).mockResolvedValueOnce({
      response: mockDetailedLog,
      error: null
    });

    // Use the hook directly
    const { getAuditLogDetails } = useAuditLogs();
    
    // Call the function
    const result = await getAuditLogDetails('log1');
    
    // Verify API call
    expect(apiCall).toHaveBeenCalledWith('v2/pdps/proj-id/env-id/audit_logs/log1', 'mock-token');
    
    // Verify response
    expect(result).toEqual({ 
      data: mockDetailedLog, 
      error: null 
    });
  });

  it('calls PDP with correct request structure', async () => {
    // Mock fetchUtil response
    vi.mocked(fetchUtil).mockResolvedValueOnce({
      success: true,
      data: { allowed: true },
      error: null
    });

    // Test request object
    const testRequest = {
      tenant: 'tenant1',
      action: 'read',
      user: { key: 'user1' },
      resource: { type: 'document', key: 'doc1' }
    };

    // Use the hook directly
    const { checkPdpPermission } = useAuditLogs();
    
    // Call the function
    const result = await checkPdpPermission(testRequest, 'http://pdp.example.com');
    
    // Verify the PDP call
    expect(fetchUtil).toHaveBeenCalledWith(
      'http://pdp.example.com/allowed',
      'POST',
      'mock-token',
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      }),
      expect.objectContaining({
        tenant: 'tenant1',
        action: 'read',
        user: { key: 'user1' },
        resource: expect.objectContaining({
          type: 'document',
          key: 'doc1'
        })
      })
    );
    
    // Verify response
    expect(result).toEqual({ 
      data: { allowed: true }, 
      error: null 
    });
  });

  it('handles PDP errors properly', async () => {
    // Mock fetchUtil error response
    vi.mocked(fetchUtil).mockResolvedValueOnce({
      success: false,
      data: null,
      error: 'PDP connection failed'
    });

    // Use the hook directly
    const { checkPdpPermission } = useAuditLogs();
    
    // Call the function
    const result = await checkPdpPermission({
      tenant: 'tenant1',
      action: 'read',
      user: { key: 'user1' },
      resource: { type: 'document' }
    }, 'http://pdp.example.com');
    
    // Verify error handling
    expect(result).toEqual({
      data: null,
      error: 'PDP connection failed'
    });
  });
});
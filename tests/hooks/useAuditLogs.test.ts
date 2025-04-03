import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditLogs } from '../../source/hooks/useAuditLogs.js';

// Mock client functions
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();

// Mock the useClient hook
vi.mock('../../source/hooks/useClient.js', () => ({
  default: () => ({
    authenticatedApiClient: () => ({
      GET: mockGetFn,
    }),
    authenticatedPdpClient: (url) => ({
      POST: mockPostFn,
    }),
  }),
}));

// Mock React hooks
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
    // Mock API success response
    mockGetFn.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'log1', timestamp: '2023-01-01', action: 'read', decision: true },
          { id: 'log2', timestamp: '2023-01-02', action: 'write', decision: false }
        ]
      },
      error: null
    });

    // Use the hook
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

    // Verify the API call
    expect(mockGetFn).toHaveBeenCalledTimes(1);
    expect(mockGetFn).toHaveBeenCalledWith(
      '/v2/pdps/{proj_id}/{env_id}/audit_logs',
      undefined,
      undefined,
      expect.objectContaining({
        timestamp_from: expect.any(Number),
        timestamp_to: expect.any(Number),
        pdp_id: 'test-pdp',
        users: ['user1', 'user2'],
        resources: ['resource1'],
        tenant: 'tenant1',
        action: 'read',
        decision: true,
        page: 1,
        per_page: 100,
        sort_by: 'timestamp'
      })
    );
    
    // Verify the result matches the mock response
    expect(result).toEqual({
      data: {
        data: [
          { id: 'log1', timestamp: '2023-01-01', action: 'read', decision: true },
          { id: 'log2', timestamp: '2023-01-02', action: 'write', decision: false }
        ]
      },
      error: null
    });
  });

  it('handles API errors properly', async () => {
    // Setup error response
    mockGetFn.mockResolvedValueOnce({
      data: null,
      error: 'Failed to fetch'
    });

    // Use the hook
    const { getAuditLogs } = useAuditLogs();
    
    // Call the function
    const result = await getAuditLogs({ timeFrame: 24 });
    
    // Verify error handling
    expect(result.data).toBeNull();
    expect(result.error).toBe('Failed to fetch');
  });

  it('fetches detailed audit log by ID', async () => {
    // Mock data with audit logs array
    const mockLogs = {
      data: [
        { id: 'log1', timestamp: '2023-01-01', action: 'read', decision: true },
        { id: 'log2', timestamp: '2023-01-02', action: 'write', decision: false }
      ]
    };
    
    mockGetFn.mockResolvedValueOnce({
      data: mockLogs,
      error: null
    });

    // Use the hook
    const { getAuditLogDetails } = useAuditLogs();
    
    // Call the function
    const result = await getAuditLogDetails('log1');
    
    // Verify API call
    expect(mockGetFn).toHaveBeenCalledWith(
      '/v2/pdps/{proj_id}/{env_id}/audit_logs',
      undefined,
      undefined,
      expect.objectContaining({
        page: 1,
        per_page: 100
      })
    );
    
    // Verify response - should find log1 in the array
    expect(result).toEqual({ 
      data: mockLogs.data[0], 
      error: null 
    });
  });

  it('handles audit log not found', async () => {
    // Mock data with audit logs array
    mockGetFn.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'log2', timestamp: '2023-01-02', action: 'write', decision: false }
        ]
      },
      error: null
    });

    // Use the hook
    const { getAuditLogDetails } = useAuditLogs();
    
    // Call the function with a non-existent ID
    const result = await getAuditLogDetails('log1');
    
    // Verify response indicates log not found
    expect(result).toEqual({ 
      data: null, 
      error: 'Audit log with ID log1 not found' 
    });
  });

  it('calls PDP with correct request structure', async () => {
    // Mock PDP success response
    mockPostFn.mockResolvedValueOnce({
      data: { allow: true },
      error: null
    });

    // Test request object
    const testRequest = {
      tenant: 'tenant1',
      action: 'read',
      user: { key: 'user1' },
      resource: { type: 'document', key: 'doc1' }
    };

    // Use the hook
    const { checkPdpPermission } = useAuditLogs();
    
    // Call the function
    const result = await checkPdpPermission(testRequest, 'http://pdp.example.com');
    
    // Verify the PDP call
    expect(mockPostFn).toHaveBeenCalledWith(
      '/allowed',
      undefined,
      expect.objectContaining({
        tenant: 'tenant1',
        action: 'read',
        user: expect.objectContaining({ key: 'user1' }),
        resource: expect.objectContaining({
          type: 'document',
          key: 'doc1',
          tenant: 'tenant1'
        })
      })
    );
    
    // Verify response
    expect(result).toEqual({ 
      data: { allow: true }, 
      error: null 
    });
  });

  it('handles PDP errors properly', async () => {
    // Mock PDP error response
    mockPostFn.mockResolvedValueOnce({
      data: null,
      error: 'PDP check failed'
    });

    // Use the hook
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
      error: 'PDP check failed: PDP check failed'
    });
  });

  it('handles PDP request exceptions', async () => {
    // Mock exception during request
    mockPostFn.mockRejectedValueOnce(new Error('Network error'));

    // Use the hook
    const { checkPdpPermission } = useAuditLogs();
    
    // Call the function
    const result = await checkPdpPermission({
      tenant: 'tenant1',
      action: 'read',
      user: { key: 'user1' },
      resource: { type: 'document' }
    }, 'http://pdp.example.com');
    
    // Verify error handling
    expect(result.data).toBeNull();
    expect(result.error).toBe('Network error');
  });
});
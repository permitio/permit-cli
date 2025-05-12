import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React first - this is critical
vi.mock('react', () => {
  const originalModule = vi.importActual('react');
  return {
    ...originalModule,
    // Make useCallback just return the callback function
    useCallback: (callback: any) => callback,
    // Make useMemo just return the value
    useMemo: (factory: any) => factory(),
  };
});

// Create mock functions
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

// Mock all required dependencies
vi.mock('../../../source/hooks/useClient', () => ({
  default: () => ({
    authenticatedApiClient: () => ({
      GET: mockGet,
      POST: mockPost,
      PATCH: mockPatch
    })
  })
}));

vi.mock('../../../source/components/AuthProvider', () => ({
  useAuth: () => ({
    scope: {
      project_id: 'test-project',
    }
  })
}));

// Import the module under test AFTER mocking dependencies
import useMigrateResources from '../../../source/hooks/migration/useMigrateResources';

describe('useMigrateResources', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('should migrate resources successfully', async () => {
    // Mock source resources
    mockGet.mockResolvedValueOnce({
      data: [
        {
          key: 'document',
          name: 'Document',
          description: 'Document resource',
          actions: { 'read': { name: 'Read', description: 'Read document' } },
          attributes: { 'status': { type: 'string', description: 'Document status' } },
          relations: { 'owner': { resource: 'user' } }
        },
        {
          key: 'project',
          name: 'Project',
          description: 'Project resource',
          actions: { 'edit': { name: 'Edit', description: 'Edit project' } }
        }
      ],
      error: null
    });
    
    // Mock target resources (empty)
    mockGet.mockResolvedValueOnce({
      data: [],
      error: null
    });
    
    // Mock successful POST responses
    mockPost.mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });
    
    const { migrateResources } = useMigrateResources();
    const result = await migrateResources('source-env', 'target-env');
    
    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('should handle conflict with override strategy', async () => {
    // Mock source resources
    const resource = {
      key: 'document',
      name: 'Document',
      description: 'Updated description',
      actions: { 'read': { name: 'Read', description: 'Read document' } }
    };
    
    mockGet.mockResolvedValueOnce({
      data: [resource],
      error: null
    });
    
    // Mock target resources (contains the same resource)
    mockGet.mockResolvedValueOnce({
      data: [{ ...resource, description: 'Old description' }],
      error: null
    });
    
    // Mock successful PATCH response
    mockPatch.mockResolvedValueOnce({ error: null });
    
    const { migrateResources } = useMigrateResources();
    const result = await migrateResources('source-env', 'target-env', 'override');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it('should handle conflict with fail strategy', async () => {
    // Mock source resources
    const resource = {
      key: 'document',
      name: 'Document',
      description: 'New description'
    };
    
    mockGet.mockResolvedValueOnce({
      data: [resource],
      error: null
    });
    
    // Mock target resources (contains the same resource)
    mockGet.mockResolvedValueOnce({
      data: [{ ...resource, description: 'Old description' }],
      error: null
    });
    
    const { migrateResources } = useMigrateResources();
    const result = await migrateResources('source-env', 'target-env', 'fail');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    // Mock source resources
    mockGet.mockResolvedValueOnce({
      data: [{ key: 'document', name: 'Document' }],
      error: null
    });
    
    // Mock target resources (empty)
    mockGet.mockResolvedValueOnce({
      data: [],
      error: null
    });
    
    // Mock POST error
    mockPost.mockResolvedValueOnce({ error: 'API error' });
    
    const { migrateResources } = useMigrateResources();
    const result = await migrateResources('source-env', 'target-env');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    
    
    expect(result.details?.[0]).toMatch('Create error');
  });
});
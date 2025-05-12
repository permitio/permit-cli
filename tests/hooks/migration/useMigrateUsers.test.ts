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
const mockPut = vi.fn();

// Mock all required dependencies
vi.mock('../../../source/hooks/useClient', () => ({
  default: () => ({
    authenticatedApiClient: () => ({
      GET: mockGet,
      POST: mockPost,
      PUT: mockPut
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
import useMigrateUsers from '../../../source/hooks/migration/useMigrateUsers';

describe('useMigrateUsers', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('should handle empty user list', async () => {
    // Mock null response data
    mockGet.mockResolvedValueOnce({ data: null, error: null });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env');
    
    expect(result.total).toBe(0);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.details).toContain('No source users');
  });

  it('should migrate users successfully', async () => {
    // Mock source users
    mockGet.mockResolvedValueOnce({ 
      data: [
        { key: 'user1', email: 'user1@example.com', first_name: 'User', last_name: 'One' },
        { key: 'user2', email: 'user2@example.com', first_name: 'User', last_name: 'Two' }
      ], 
      error: null 
    });
    
    // Mock successful POST responses
    mockPost.mockResolvedValueOnce({ error: null })
            .mockResolvedValueOnce({ error: null });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env');
    
    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('should handle conflict with override strategy', async () => {
    // Mock source users
    mockGet.mockResolvedValueOnce({ 
      data: [
        { key: 'user1', email: 'user1@example.com', first_name: 'User', last_name: 'One' }
      ], 
      error: null 
    });
    
    // Mock POST response with conflict
    mockPost.mockResolvedValueOnce({ 
      error: 'User with key user1 already exists' 
    });
    
    // Mock successful PUT response for override
    mockPut.mockResolvedValueOnce({ error: null });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env', 'override');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledTimes(1);
  });

  it('should handle conflict with fail strategy', async () => {
    // Mock source users
    mockGet.mockResolvedValueOnce({ 
      data: [
        { key: 'user1', email: 'user1@example.com', first_name: 'User', last_name: 'One' }
      ], 
      error: null 
    });
    
    // Mock POST response with conflict
    mockPost.mockResolvedValueOnce({ 
      error: 'User with key user1 already exists' 
    });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env', 'fail');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    // Mock API error
    mockGet.mockResolvedValueOnce({ data: null, error: 'API error' });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env');
    
    expect(result.details).toContain('No source users');
  });

  it('should handle unexpected exceptions', async () => {
    // Mock source users
    mockGet.mockResolvedValueOnce({ 
      data: [
        { key: 'user1', email: 'user1@example.com' }
      ], 
      error: null 
    });
    
    // Mock POST to throw exception
    mockPost.mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });
    
    const { migrateUsers } = useMigrateUsers();
    const result = await migrateUsers('source-env', 'target-env');
    
    expect(result.total).toBe(1);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.details?.[0]).toContain('Unexpected error');
  });
});
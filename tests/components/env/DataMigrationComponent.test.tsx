import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React hooks
vi.mock('react', () => {
  const originalModule = vi.importActual('react');
  return {
    ...originalModule,
    useCallback: (callback: any) => callback,
    useMemo: (factory: any) => factory(),
  };
});

// Create mock functions
const mockMigrateUsers = vi.fn();
const mockMigrateRoles = vi.fn();
const mockMigrateResources = vi.fn();
const mockMigrateRoleAssignments = vi.fn();

// Mock dependencies
vi.mock('../../../source/hooks/migration/useMigrateUsers', () => ({
  default: () => ({
    migrateUsers: mockMigrateUsers
  })
}));

vi.mock('../../../source/hooks/migration/useMigrateRoles', () => ({
  default: () => ({
    migrateRoles: mockMigrateRoles
  })
}));

vi.mock('../../../source/hooks/migration/useMigrateResources', () => ({
  default: () => ({
    migrateResources: mockMigrateResources
  })
}));

vi.mock('../../../source/hooks/migration/useMigrateRoleAssignments', () => ({
  default: () => ({
    migrateRoleAssignments: mockMigrateRoleAssignments
  })
}));

vi.mock('../../../source/hooks/useDataMigration', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    default: () => {
      const original = mod.default();
      const originalMigrateAllData = original.migrateAllData;
      
      return {
        ...original,
        migrateAllData: async (sourceEnvId, targetEnvId, options) => {
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = (fn) => {
            fn();
            return 0 as any;
          };
          
          try {
            return await originalMigrateAllData(sourceEnvId, targetEnvId, options);
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      };
    }
  };
});

import useDataMigration from '../../../source/hooks/useDataMigration';

describe('useDataMigration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should migrate all data in correct order', async () => {
    mockMigrateResources.mockResolvedValue({ total: 5, success: 5, failed: 0 });
    mockMigrateUsers.mockResolvedValue({ total: 10, success: 10, failed: 0 });
    mockMigrateRoles.mockResolvedValue({ total: 3, success: 3, failed: 0 });
    mockMigrateRoleAssignments.mockResolvedValue({ total: 8, success: 8, failed: 0 });
    
    const { migrateAllData } = useDataMigration();
    const result = await migrateAllData('source-env', 'target-env');
    
    // Verify results
    expect(result).toEqual({
      resources: { total: 5, success: 5, failed: 0 },
      users: { total: 10, success: 10, failed: 0 },
      roles: { total: 3, success: 3, failed: 0 },
      roleAssignments: { total: 8, success: 8, failed: 0 }
    });
    
    // Verify calls were made with correct parameters
    expect(mockMigrateResources).toHaveBeenCalledWith('source-env', 'target-env', 'override');
    expect(mockMigrateUsers).toHaveBeenCalledWith('source-env', 'target-env', 'override');
    expect(mockMigrateRoles).toHaveBeenCalledWith('source-env', 'target-env', 'override');
    expect(mockMigrateRoleAssignments).toHaveBeenCalledWith('source-env', 'target-env', 'override');
    
    // Basic order verification based on mock calls
    const resourcesCallIndex = mockMigrateResources.mock.invocationCallOrder[0];
    const usersCallIndex = mockMigrateUsers.mock.invocationCallOrder[0];
    const rolesCallIndex = mockMigrateRoles.mock.invocationCallOrder[0];
    const roleAssignmentsCallIndex = mockMigrateRoleAssignments.mock.invocationCallOrder[0];
    
    expect(resourcesCallIndex).toBeLessThan(usersCallIndex);
    expect(usersCallIndex).toBeLessThan(rolesCallIndex);
    expect(rolesCallIndex).toBeLessThan(roleAssignmentsCallIndex);
  }, 10000); 

  it('should respect skipResources option', async () => {
    mockMigrateUsers.mockResolvedValue({ total: 10, success: 10, failed: 0 });
    mockMigrateRoles.mockResolvedValue({ total: 3, success: 3, failed: 0 });
    mockMigrateRoleAssignments.mockResolvedValue({ total: 8, success: 8, failed: 0 });
    
    const { migrateAllData } = useDataMigration();
    const result = await migrateAllData('source-env', 'target-env', { skipResources: true });
    
    // Verify resources were skipped
    expect(mockMigrateResources).not.toHaveBeenCalled();
    expect(mockMigrateUsers).toHaveBeenCalled();
    expect(mockMigrateRoles).toHaveBeenCalled();
    expect(mockMigrateRoleAssignments).toHaveBeenCalled();
    expect(result.resources).toEqual({ total: 0, success: 0, failed: 0 });
  }, 10000);

  it('should respect skipUsers option', async () => {
    mockMigrateResources.mockResolvedValue({ total: 5, success: 5, failed: 0 });
    
    const { migrateAllData } = useDataMigration();
    const result = await migrateAllData('source-env', 'target-env', { skipUsers: true });
    
    // Verify users were skipped
    expect(mockMigrateResources).toHaveBeenCalled();
    expect(mockMigrateUsers).not.toHaveBeenCalled();
    expect(mockMigrateRoles).not.toHaveBeenCalled();
    expect(mockMigrateRoleAssignments).not.toHaveBeenCalled();
    expect(result.users).toEqual({ total: 0, success: 0, failed: 0 });
  });

  it('should respect conflictStrategy option', async () => {
    mockMigrateResources.mockResolvedValue({ total: 5, success: 5, failed: 0 });
    mockMigrateUsers.mockResolvedValue({ total: 10, success: 10, failed: 0 });
    mockMigrateRoles.mockResolvedValue({ total: 3, success: 3, failed: 0 });
    mockMigrateRoleAssignments.mockResolvedValue({ total: 8, success: 8, failed: 0 });
    
    const { migrateAllData } = useDataMigration();
    await migrateAllData('source-env', 'target-env', { conflictStrategy: 'fail' });
    
    // Verify conflict strategy was passed to all migrations
    expect(mockMigrateResources).toHaveBeenCalledWith('source-env', 'target-env', 'fail');
    expect(mockMigrateUsers).toHaveBeenCalledWith('source-env', 'target-env', 'fail');
    expect(mockMigrateRoles).toHaveBeenCalledWith('source-env', 'target-env', 'fail');
    expect(mockMigrateRoleAssignments).toHaveBeenCalledWith('source-env', 'target-env', 'fail');
  }, 10000); 

  it('should handle errors during migration', async () => {
    // Make resources migration throw an error
    mockMigrateResources.mockRejectedValue(new Error('Resources migration failed'));
    
    const { migrateAllData } = useDataMigration();
    await expect(migrateAllData('source-env', 'target-env')).rejects.toThrow('Resources migration failed');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Migration error:', expect.any(Error));
  });
});
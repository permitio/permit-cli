import { describe, it, expect, vi } from 'vitest';
import { RoleGenerator } from '../../source/commands/env/export/generators/RoleGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('RoleGenerator', () => {
  const mockPermit = {
    api: {
      resources: {
        list: vi.fn().mockResolvedValue([
          {
            key: 'document',
            roles: {
              admin: {
                name: 'Administrator',
                description: 'Admin role',
                permissions: ['document:read', 'document:write']
              }
            }
          }
        ])
      },
      roles: {
        list: vi.fn().mockResolvedValue([
          {
            key: 'admin',
            name: 'Administrator',
            description: 'Admin role',
            permissions: ['document:read', 'document:write'],
          }
        ])
      }
    }
  };

  it('generates valid HCL for roles', async () => {
    const generator = new RoleGenerator(
      mockPermit as any,
      createWarningCollector()
    );

    const hcl = await generator.generateHCL();

    // Basic structure checks
    expect(hcl).toContain('# Roles');
    expect(hcl).toContain('resource "permitio_role" "admin"');

    // Field checks 
    expect(hcl).toContain('key         = "admin"');
    expect(hcl).toContain('name        = "Administrator"');
    expect(hcl).toContain('description = "Admin role"');
    expect(hcl).toContain('resource    = permitio_resource.document.key');
    expect(hcl).toContain('permissions = ["read", "write"]');
    expect(hcl).toContain('depends_on  = [permitio_resource.document]');

    expect(hcl.trim()).toMatchInlineSnapshot(`"# Roles
resource "permitio_role" "admin" {
  key         = "admin"
  name        = "Administrator"
  resource    = permitio_resource.document.key
  permissions = ["read", "write"]
  description = "Admin role"
  depends_on  = [permitio_resource.document]
}"`);
  });

  it('handles API errors gracefully', async () => {
    const errorMockPermit = {
      api: {
        resources: {
          list: vi.fn().mockRejectedValue(new Error('API Error'))
        },
        roles: {
          list: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    };

    const warningCollector = createWarningCollector();
    const generator = new RoleGenerator(
      errorMockPermit as any,
      warningCollector
    );

    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
    expect(warningCollector.getWarnings()).toContain(
      'Failed to export roles: Error: API Error'
    );
  });
});
import { describe, it, expect, vi } from 'vitest';
import { RoleDerivationGenerator } from '../../source/commands/env/export/generators/RoleDerivationGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';
import Handlebars from 'handlebars';

// Mock the file system operations
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(`{{#each derivations}}
resource "permitio_role_derivation" "{{resource_id}}" {
  resource    = "{{resource}}"
  role        = "{{role}}"
  linked_by   = "{{linked_by}}"
  on_resource = "{{on_resource}}"
  to_role     = "{{to_role}}"
  {{#if dependencies}}
  depends_on  = {{{json dependencies}}}
  {{/if}}
}
{{/each}}`),
}));

// Register the json helper for Handlebars
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

describe('RoleDerivationGenerator', () => {
  const mockPermit = {
    api: {
      resources: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'res1',
            key: 'document',
          }
        ]),
      },
      resourceRoles: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'role1',
            key: 'document_user',
            resource: 'document',
            name: 'User'
          }
        ]),
      },
      resourceRelations: {
        list: vi.fn().mockResolvedValue([
          {
            key: 'parent',
            subject_resource: 'document',
            object_resource: 'document'
          }
        ])
      }
    },
  };

  it('generates valid HCL for role derivations', async () => {
    const generator = new RoleDerivationGenerator(
      mockPermit as any,
      createWarningCollector(),
    );

    const hcl = await generator.generateHCL();

    expect(hcl).toContain('# Role Derivations');
    expect(hcl).toContain('resource "permitio_role_derivation"');
    expect(hcl).toContain('resource    = "document"');
    expect(hcl).toContain('role        = "document_user"');
  });

  it('handles resources with missing keys', async () => {
    const mockPermitWithInvalidResource = {
      api: {
        resources: {
          list: vi.fn().mockResolvedValue([
            {
              id: 'res1'
              
            },
          ]),
        },
        resourceRoles: {
          list: vi.fn().mockResolvedValue([])
        },
        resourceRelations: {
          list: vi.fn().mockResolvedValue([])
        }
      },
    };

    const warningCollector = createWarningCollector();
    const generator = new RoleDerivationGenerator(
      mockPermitWithInvalidResource as any,
      warningCollector,
    );

    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
    expect(warningCollector.getWarnings()).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    const errorMockPermit = {
      api: {
        resources: {
          list: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      },
    };

    const warningCollector = createWarningCollector();
    const generator = new RoleDerivationGenerator(
      errorMockPermit as any,
      warningCollector,
    );

    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
    expect(warningCollector.getWarnings()).toContain(
      'Failed to gather resources: Error: API Error'
    );
  });

  it('handles empty resources list', async () => {
    const emptyMockPermit = {
      api: {
        resources: {
          list: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const generator = new RoleDerivationGenerator(
      emptyMockPermit as any,
      createWarningCollector(),
    );

    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
  });

  it('handles role derivation list errors', async () => {
    const mockPermitWithDerivationError = {
      api: {
        resources: {
          list: vi.fn().mockResolvedValue([
            {
              id: 'res1',
              key: 'document',
            },
          ]),
        },
        resourceRoles: {
          list: vi.fn().mockRejectedValue(new Error('Derivation API Error')),
        },
        resourceRelations: {
          list: vi.fn().mockResolvedValue([])
        }
      },
    };

    const warningCollector = createWarningCollector();
    const generator = new RoleDerivationGenerator(
      mockPermitWithDerivationError as any,
      warningCollector,
    );

    const hcl = await generator.generateHCL();
    expect(warningCollector.getWarnings()).toContain(
      'Failed to gather data for resource \'document\': Error: Derivation API Error'
    );
  });
});
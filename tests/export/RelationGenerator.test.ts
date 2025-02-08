import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationGenerator } from '../../source/commands/env/export/generators/RelationGenerator';
import type { WarningCollector } from '../../source/commands/env/export/types';

describe('RelationGenerator', () => {
  let warningCollector: WarningCollector;
  let mockPermit: any;

  beforeEach(() => {
    warningCollector = {
      addWarning: vi.fn(),
      getWarnings: vi.fn().mockReturnValue([]),
    };
    mockPermit = {
      api: {
        resources: {
          list: vi.fn(),
          get: vi.fn(),
        },
      },
    };
  });

  it('generates empty string when no resources exist', async () => {
    mockPermit.api.resources.list.mockResolvedValue([]);
    const generator = new RelationGenerator(mockPermit, warningCollector);
    const result = await generator.generateHCL();
    expect(result).toBe('');
  });

  it('skips internal user resource', async () => {
    mockPermit.api.resources.list.mockResolvedValue([
      { key: '__user' },
      { key: 'document' },
    ]);
    mockPermit.api.resources.get.mockResolvedValue({
      key: 'document',
      relations: {},
    });

    const generator = new RelationGenerator(mockPermit, warningCollector);
    await generator.generateHCL();

    expect(mockPermit.api.resources.get).toHaveBeenCalledTimes(1);
    expect(mockPermit.api.resources.get).toHaveBeenCalledWith('document');
  });

  it('generates valid HCL for relations', async () => {
    mockPermit.api.resources.list.mockResolvedValue([
      { key: 'document' },
      { key: 'user' },
    ]);

    mockPermit.api.resources.get.mockImplementation((key) => {
      if (key === 'document') {
        return Promise.resolve({
          key: 'document',
          relations: {
            owner: {
              description: 'Document owner',
              resource: 'user',
              resource_id: 'user_id',
            },
          },
        });
      }
      if (key === 'user') {
        return Promise.resolve({
          key: 'user',
          relations: {},
        });
      }
      return Promise.reject(new Error('Invalid resource'));
    });

    const generator = new RelationGenerator(mockPermit, warningCollector);
    const result = await generator.generateHCL();

    const expectedContent = [
      'resource "permitio_relation" "owner"',
      'key              = "owner"',
      'name             = "Owner"',
      'description      = "Document owner"',
      'subject_resource = permitio_resource.user.key',
      'object_resource  = permitio_resource.document.key',
      'depends_on = [',
      'permitio_resource.user,',
      'permitio_resource.document',
    ];

    expectedContent.forEach(content => {
      expect(result).toContain(content);
    });
  });

  it('handles errors when fetching relations', async () => {
    mockPermit.api.resources.list.mockResolvedValue([{ key: 'document' }]);
    mockPermit.api.resources.get.mockRejectedValue(new Error('API error'));

    const generator = new RelationGenerator(mockPermit, warningCollector);
    await generator.generateHCL();

    expect(warningCollector.addWarning).toHaveBeenCalledWith(
      'Failed to fetch details for resource document: Error: API error'
    );
  });

  it('skips invalid relations', async () => {
    mockPermit.api.resources.list.mockResolvedValue([{ key: 'document' }]);
    mockPermit.api.resources.get.mockRejectedValue(new Error('API error'));

    const generator = new RelationGenerator(mockPermit, warningCollector);
    const result = await generator.generateHCL();

    expect(warningCollector.addWarning).toHaveBeenCalledWith(
      'Failed to fetch details for resource document: Error: API error'
    );
    expect(result).toBe('');
  });
});
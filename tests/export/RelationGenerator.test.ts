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
        },
        resourceRelations: {
          list: vi.fn(),
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
    mockPermit.api.resources.list
      .mockResolvedValueOnce([{ key: '__user' }, { key: 'document' }])
      .mockResolvedValueOnce([{ key: '__user' }, { key: 'document' }]);
    mockPermit.api.resourceRelations.list.mockResolvedValue([]);

    const generator = new RelationGenerator(mockPermit, warningCollector);
    await generator.generateHCL();
    expect(mockPermit.api.resourceRelations.list).toHaveBeenCalledTimes(1);
    expect(mockPermit.api.resourceRelations.list).toHaveBeenCalledWith({
      resourceKey: 'document',
    });
  });

  it('generates valid HCL for relations', async () => {
    const mockResources = [{ key: 'document' }, { key: 'user' }];
    const mockRelations = [
      {
        key: 'owner',
        name: 'Owner',
        description: 'Document owner',
        subject_resource: 'user',
        object_resource: 'document',
      },
    ];

    mockPermit.api.resources.list
      .mockResolvedValueOnce(mockResources)
      .mockResolvedValueOnce(mockResources);
    mockPermit.api.resourceRelations.list.mockResolvedValue(mockRelations);

    const generator = new RelationGenerator(mockPermit, warningCollector);
    const result = await generator.generateHCL();
    
    expect(result).toContain('resource "permitio_relation" "owner"');
    expect(result).toContain('key = "owner"');
    expect(result).toContain('name = "Owner"');
    expect(result).toContain('description = "Document owner"');
    expect(result).toContain('subject_resource = "user"');
    expect(result).toContain('object_resource = "document"');
  });

  it('handles errors when fetching relations', async () => {
    mockPermit.api.resources.list
      .mockResolvedValueOnce([{ key: 'document' }])
      .mockResolvedValueOnce([{ key: 'document' }]);
    mockPermit.api.resourceRelations.list.mockRejectedValue(new Error('API error'));

    const generator = new RelationGenerator(mockPermit, warningCollector);
    await generator.generateHCL();
    expect(warningCollector.addWarning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch relations for resource document'),
    );
  });

  it('skips invalid relations', async () => {
    mockPermit.api.resources.list
      .mockResolvedValueOnce([{ key: 'document' }])
      .mockResolvedValueOnce([{ key: 'document' }]);
    mockPermit.api.resourceRelations.list.mockResolvedValue([
      { key: 'invalid' },
    ]);

    const generator = new RelationGenerator(mockPermit, warningCollector);
    const result = await generator.generateHCL();
    
    expect(warningCollector.addWarning).toHaveBeenCalledWith(
      'Relation "invalid" is missing required fields: name, subject_resource, object_resource'
    );
    expect(result).not.toContain('resource "permitio_relation" "invalid"');
  });
});
import { expect, describe, it, beforeEach, vi } from 'vitest';
import { ConditionSetGenerator } from '../../source/commands/env/export/generators/ConditionSetGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils.js';
import type { Permit } from 'permitio';

describe('ConditionSetGenerator', () => {
  let generator: ConditionSetGenerator;
  let mockPermit: { api: any };
  let warningCollector: ReturnType<typeof createWarningCollector>;

  beforeEach(() => {
    mockPermit = {
      api: {
        conditionSets: {
          list: vi.fn().mockResolvedValue([
            {
              key: 'us_employees',
              name: 'US Employees',
              type: 'userset',
              description: 'Employees in US',
              conditions: { country: 'US' },
            },
            {
              key: 'confidential_docs',
              name: 'Confidential Documents',
              type: 'resourceset',
              description: 'Confidential documents',
              resource: 'document',
              conditions: { classification: 'confidential' },
            },
          ]),
        },
      },
    };
    warningCollector = createWarningCollector();
    generator = new ConditionSetGenerator(
      mockPermit as unknown as Permit,
      warningCollector,
    );
  });

  it('generates valid HCL for condition sets', async () => {
    const hcl = await generator.generateHCL();
    
    // Test for specific patterns using escaped quotes
    expect(hcl).toContain('conditions = {&quot;country&quot;:&quot;US&quot;}');
    expect(hcl).toContain('conditions = {&quot;classification&quot;:&quot;confidential&quot;}');
    
    // Test structural elements that don't involve escaped JSON
    expect(hcl).toContain('resource "permitio_user_set" "us_employees"');
    expect(hcl).toContain('resource "permitio_resource_set" "confidential_docs"');
    expect(hcl).toContain('key = "us_employees"');
    expect(hcl).toContain('resource = "document"');
  });

  it('handles empty condition sets', async () => {
    mockPermit.api.conditionSets.list.mockResolvedValueOnce([]);
    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
  });

  it('handles errors and adds warnings', async () => {
    mockPermit.api.conditionSets.list.mockRejectedValueOnce(
      new Error('API Error'),
    );
    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
    expect(warningCollector.getWarnings()[0]).toContain(
      'Failed to export condition sets',
    );
  });
});
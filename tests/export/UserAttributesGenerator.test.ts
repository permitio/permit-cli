import { expect, describe, it, beforeEach, vi } from 'vitest';
import { UserAttributesGenerator } from '../../source/commands/env/export/generators/UserAttributesGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils.js';
import type { Permit } from 'permitio';

describe('UserAttributesGenerator', () => {
  let generator: UserAttributesGenerator;
  let mockPermit: { api: any };
  let warningCollector: ReturnType<typeof createWarningCollector>;

  beforeEach(() => {
    mockPermit = {
      api: {
        resources: {
          get: vi.fn().mockResolvedValue({
            attributes: {
              'department': {
                type: 'string',
                description: 'User department',
              },
              'age': {
                type: 'number',
              },
            },
          }),
        },
      },
    };
    
    warningCollector = createWarningCollector();
    generator = new UserAttributesGenerator(
      mockPermit as unknown as Permit,
      warningCollector,
    );
  });

  it('generates valid HCL for user attributes', async () => {
    const hcl = await generator.generateHCL();
    
    // Check that the HCL contains the user attributes header
    expect(hcl).toContain('# User Attributes');
    
    // Check that attribute entries are present without focusing on specific formatting
    expect(hcl).toContain('permitio_user_attribute');
    expect(hcl).toContain('department');
    expect(hcl).toContain('age');
    expect(hcl).toContain('string');
    expect(hcl).toContain('number');
    expect(hcl).toContain('User department');
  });

  it('handles empty attributes list', async () => {
    // Set up resources.get to return a resource with no attributes
    mockPermit.api.resources.get.mockResolvedValueOnce({
      attributes: {}
    });
    
    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
  });

  it('generates HCL without description for attributes missing it', async () => {
    mockPermit.api.resources.get.mockResolvedValueOnce({
      attributes: {
        'simple': {
          type: 'string',
        },
      },
    });
    
    const hcl = await generator.generateHCL();
    
    // Check for the attribute presence
    expect(hcl).toContain('permitio_user_attribute');
    expect(hcl).toContain('simple');
    expect(hcl).toContain('type');
    expect(hcl).toContain('string');
    
    // Ensure no description line is present
    const lines = hcl.split('\n');
    const descriptionLines = lines.filter(line => line.includes('description'));
    expect(descriptionLines.length).toBe(0);
  });

  it('filters out built-in attributes', async () => {
    mockPermit.api.resources.get.mockResolvedValueOnce({
      attributes: {
        'department': {
          type: 'string',
          description: 'User department',
        },
        'email': {
          type: 'string',
          description: 'Built in attribute for email',
        },
      },
    });
    
    const hcl = await generator.generateHCL();
    
    // Should include the custom attribute
    expect(hcl).toContain('department');
    
    // Should not include the built-in attribute
    expect(hcl).not.toContain('email');
    expect(hcl).not.toContain('Built in attribute for email');
  });

  it('handles API errors', async () => {
    mockPermit.api.resources.get.mockRejectedValueOnce(
      new Error('API Error'),
    );
    
    const hcl = await generator.generateHCL();
    expect(hcl).toBe('');
    
    // Check that a warning was recorded
    const warnings = warningCollector.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    
    // Check for both warning messages
    const fetchErrorWarning = warnings.find(w => 
      w.includes('Error fetching user attributes')
    );
    expect(fetchErrorWarning).toBeDefined();
    
    const exportErrorWarning = warnings.find(w => 
      w.includes('Failed to export user attributes')
    );
    expect(exportErrorWarning).toBeDefined();
  });

  it('normalizes attribute types correctly', async () => {
    mockPermit.api.resources.get.mockResolvedValueOnce({
      attributes: {
        'boolField': {
          type: 'boolean',
        },
        'jsonField': {
          type: 'object',
        },
        'unknownField': {
          type: 'unknown',
        },
      },
    });
    
    const hcl = await generator.generateHCL();
    
    // Check normalized keys are present
    expect(hcl).toContain('boolField');
    expect(hcl).toContain('jsonField');
    expect(hcl).toContain('unknownField');
    
    // Use regex matching to account for formatting differences in the generated HCL
    expect(hcl).toMatch(/type\s*=\s*"bool"/);
    expect(hcl).toMatch(/type\s*=\s*"json"/);
    expect(hcl).toMatch(/type\s*=\s*"string"/); // Unknown type defaults to string
    
    // Check for warning about unknown type
    const warnings = warningCollector.getWarnings();
    const unknownTypeWarning = warnings.find(w => 
      w.includes('Unknown attribute type: unknown')
    );
    expect(unknownTypeWarning).toBeDefined();
  });
});

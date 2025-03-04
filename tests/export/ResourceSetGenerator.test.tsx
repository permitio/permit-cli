import { describe, it, expect, vi } from 'vitest';
import { ResourceSetGenerator } from '../../source/commands/env/export/generators/ResourceSetGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('ResourceSetGenerator', () => {
	const mockPermit = {
		api: {
			conditionSets: {
				list: vi.fn().mockResolvedValue([
					{
						key: 'test-set',
						name: 'Test Set',
						description: 'Test resource set',
						type: 'resourceset',
						conditions: { attribute: 'value' },
						resource_id: 'document',
					},
					{
						key: 'user-set',
						name: 'User Set',
						type: 'userset',
						conditions: 'user.department == "IT"',
						resource_id: 'user',
					},
				]),
			},
			resources: {
				list: vi.fn().mockResolvedValue([
					{ id: 'document', key: 'document' },
					{ id: 'user', key: 'user' },
				]),
			},
		},
	};

	it('generates valid HCL for resource sets', async () => {
		const generator = new ResourceSetGenerator(
			mockPermit as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		expect(hcl).toContain('# Resource Sets');
		expect(hcl).toContain('resource "permitio_resource_set" "test_set"');

		expect(hcl).toContain('key         = "test_set"');
		expect(hcl).toContain('name        = "Test Set"');
		expect(hcl).toContain('description = "Test resource set"');
		expect(hcl).toContain('resource    = permitio_resource.document.key');

		expect(hcl).toContain('conditions  = jsonencode({');
		expect(hcl).toContain('"attribute": "value"');

		// Dependency check
		expect(hcl).toContain('depends_on  = [');
		expect(hcl).toContain('permitio_resource.document');

		// Negative assertions
		expect(hcl).not.toContain('user-set');
		expect(hcl).not.toContain('userset');

		expect(hcl.trim()).toMatchInlineSnapshot(`
"# Resource Sets
resource "permitio_resource_set" "test_set" {
  name        = "Test Set"
  key         = "test_set"
  description = "Test resource set"
  resource    = permitio_resource.document.key
  conditions  = jsonencode({
  "attribute": "value"
})

  depends_on  = [
    permitio_resource.document
  ]
}"
    `);
	});

	it('generates valid HCL for resource sets with string conditions', async () => {
		const mockPermitWithStringConditions = {
			api: {
				conditionSets: {
					list: vi.fn().mockResolvedValue([
						{
							key: 'string-condition-set',
							name: 'String Condition Set',
							type: 'resourceset',
							conditions: 'resource.owner == user.id',
							resource_id: 'document',
						},
					]),
				},
				resources: {
					list: vi
						.fn()
						.mockResolvedValue([{ id: 'document', key: 'document' }]),
				},
			},
		};

		const generator = new ResourceSetGenerator(
			mockPermitWithStringConditions as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		expect(hcl).toContain('conditions  = resource.owner == user.id');

		expect(hcl.trim()).toMatchInlineSnapshot(`
"# Resource Sets
resource "permitio_resource_set" "string_condition_set" {
  name        = "String Condition Set"
  key         = "string_condition_set"
  resource    = permitio_resource.document.key
  conditions  = resource.owner == user.id

  depends_on  = [
    permitio_resource.document
  ]
}"
    `);
	});

	it('returns empty string when no resource sets exist', async () => {
		const emptyMockPermit = {
			api: {
				conditionSets: {
					list: vi.fn().mockResolvedValue([
						{
							key: 'user-set',
							name: 'User Set',
							type: 'userset',
							conditions: 'user.department == "IT"',
						},
					]),
				},
			},
		};

		const generator = new ResourceSetGenerator(
			emptyMockPermit as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
	});

	it('handles API errors gracefully', async () => {
		const errorMockPermit = {
			api: {
				conditionSets: {
					list: vi.fn().mockRejectedValue(new Error('API Error')),
				},
			},
		};

		const warningCollector = createWarningCollector();
		const generator = new ResourceSetGenerator(
			errorMockPermit as any,
			warningCollector,
		);

		const hcl = await generator.generateHCL();

		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()).toContain(
			'Failed to export resource sets: Error: API Error',
		);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSetGenerator } from '../../source/commands/env/export/generators/UserSetGenerator';
import type { WarningCollector } from '../../source/commands/env/export/types';
import Handlebars from 'handlebars';

// Mock fs module
vi.mock('fs', () => ({
	readFileSync: vi.fn().mockReturnValue(`
    {{#each sets}}
    resource "permitio_user_set" "{{key}}" {
      key = "{{key}}"
      name = "{{name}}"
      {{#if description}}
      description = "{{description}}"
      {{/if}}
      {{#if resource}}
      resource = "{{resource}}"
      {{/if}}
      conditions = {{formatConditions conditions}}
      {{#if depends_on.length}}
      depends_on = [
        {{#each depends_on}}
        {{this}},
        {{/each}}
      ]
      {{/if}}
    }
    {{/each}}
  `),
}));

// Mock path and url
vi.mock('path', () => ({
	join: vi.fn().mockReturnValue('/mocked/path'),
	dirname: vi.fn().mockReturnValue('/mocked/dir'),
}));

vi.mock('url', () => ({
	fileURLToPath: vi.fn().mockReturnValue('/mocked/file'),
}));

describe('UserSetGenerator', () => {
	let warningCollector: WarningCollector;
	let mockPermit: any;

	beforeEach(() => {
		warningCollector = {
			addWarning: vi.fn(),
			getWarnings: vi.fn().mockReturnValue([]),
		};
		mockPermit = {
			api: {
				conditionSets: {
					list: vi.fn(),
				},
				resources: {
					get: vi.fn(),
				},
			},
		};
	});

	it('generates empty string when no condition sets exist', async () => {
		mockPermit.api.conditionSets.list.mockResolvedValue([]);
		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();
		expect(result).toBe('');
	});

	it('generates valid HCL for user sets', async () => {
		const mockConditionSets = [
			{
				key: 'us_based',
				name: 'US Based Users',
				description: 'Users from United States',
				type: 'userset',
				conditions: { location: 'US' },
				resource_id: null,
			},
			{
				key: 'premium_users',
				name: 'Premium Users',
				type: 'userset',
				conditions: { user: { subscription: 'premium' } },
				resource_id: 'subscription',
			},
			{
				key: 'resource_set',
				name: 'Resource Set',
				type: 'resourceset',
				conditions: {},
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockResolvedValue({
			attributes: {},
		});

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		// Basic checks
		expect(result).toContain('# User Sets');
		expect(result).toContain('resource "permitio_user_set" "us_based"');
		expect(result).toContain('resource "permitio_user_set" "premium_users"');
		expect(result).not.toContain('resource_set');
	});

	it('handles errors when fetching condition sets', async () => {
		mockPermit.api.conditionSets.list.mockRejectedValue(new Error('API error'));
		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('');
		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			expect.stringContaining('Failed to export user sets'),
		);
	});

	it('handles empty or invalid conditions', async () => {
		const mockConditionSets = [
			{
				key: 'empty_conditions',
				name: 'Empty Conditions',
				type: 'userset',
				conditions: {},
				resource_id: null,
			},
			{
				key: 'null_conditions',
				name: 'Null Conditions',
				type: 'userset',
				conditions: null,
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockResolvedValue({ attributes: {} });

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			'User set "empty_conditions" has no valid conditions and will be skipped.',
		);
		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			'User set "null_conditions" has no valid conditions and will be skipped.',
		);
	});

	it('properly processes conditions for terraform format', async () => {
		const mockConditionSets = [
			{
				key: 'complex_conditions',
				name: 'Complex Conditions',
				type: 'userset',
				conditions: {
					allOf: [
						{ 'subject.department': { equals: 'engineering' } },
						{ 'subject.clearance_level': { greater_than: 3 } },
					],
				},
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockResolvedValue({
			attributes: {
				department: { type: 'string', description: 'User department' },
				clearance_level: {
					type: 'number',
					description: 'User clearance level',
				},
			},
		});

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toContain(
			'resource "permitio_user_set" "complex_conditions"',
		);
		expect(result).toContain('allOf');
		expect(result).toContain('subject.department');
		expect(result).toContain('subject.clearance_level');
	});

	it('properly formats different condition types using formatConditions helper', async () => {
		// This test covers the formatConditions helper for various input types
		const generator = new UserSetGenerator(mockPermit, warningCollector);

		// Create a reference to the formatConditions helper
		const formatConditions = (Handlebars as any).helpers.formatConditions;

		// Test with string
		expect(formatConditions('test')).toBe('"test"');

		// Test with number
		expect(formatConditions(123)).toBe('123');

		// Test with boolean
		expect(formatConditions(true)).toBe('true');

		// Test with null
		expect(formatConditions(null)).toBe('null');

		// Test with array
		expect(formatConditions([1, 2, 3])).toContain('[');
		expect(formatConditions([1, 2, 3])).toContain('1');
		expect(formatConditions([1, 2, 3])).toContain('2');
		expect(formatConditions([1, 2, 3])).toContain('3');
		expect(formatConditions([1, 2, 3])).toContain(']');

		// Test with object
		const testObj = { key1: 'value1', key2: 123 };
		const formattedObj = formatConditions(testObj);
		expect(formattedObj).toContain('{');
		expect(formattedObj).toContain('key1');
		expect(formattedObj).toContain('"value1"');
		expect(formattedObj).toContain('key2');
		expect(formattedObj).toContain('123');
		expect(formattedObj).toContain('}');

		// Test with special operators
		const specialOpObj = { array_intersect: 'val1,val2,val3' };
		const formattedSpecialObj = formatConditions(specialOpObj);
		expect(formattedSpecialObj).toContain('array_intersect');
		expect(formattedSpecialObj).toContain('val1,val2,val3');
	});

	it('correctly sets and uses shared user attributes', async () => {
		const mockConditionSets = [
			{
				key: 'attribute_dependent',
				name: 'Attribute Dependent',
				type: 'userset',
				conditions: {
					'subject.clearance_level': { greater_than: 5 },
				},
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);

		// Don't mock resources.get so setUserAttributes is used instead
		mockPermit.api.resources.get.mockRejectedValue(
			new Error('Should use shared attributes'),
		);

		const generator = new UserSetGenerator(mockPermit, warningCollector);

		// Set shared attributes
		generator.setUserAttributes([
			{
				key: 'clearance_level',
				resourceKey: 'user_clearance_level',
				type: 'number',
				description: 'Security clearance level',
			},
		]);

		const result = await generator.generateHCL();

		expect(result).toContain(
			'resource "permitio_user_set" "attribute_dependent"',
		);
		expect(result).toContain('permitio_user_attribute.user_clearance_level');
	});

	it('handles various condition formats', async () => {
		const mockConditionSets = [
			{
				key: 'various_formats',
				name: 'Various Formats',
				type: 'userset',
				conditions: {
					allOf: [
						{ 'subject.department': { equals: 'engineering' } },
						{
							anyOf: [
								{ 'subject.level': { greater_than: 3 } },
								{ 'subject.role': { in: ['admin', 'manager'] } },
							],
						},
					],
				},
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockResolvedValue({
			attributes: {
				department: { type: 'string', description: 'Department' },
				level: { type: 'number', description: 'Level' },
				role: { type: 'string', description: 'Role' },
			},
		});

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toContain('resource "permitio_user_set" "various_formats"');
		expect(result).toContain('allOf');
		expect(result).toContain('anyOf');
		expect(result).toContain('subject.department');
		expect(result).toContain('subject.level');
		expect(result).toContain('subject.role');
	});

	it('handles error when fetching user attributes', async () => {
		const mockConditionSets = [
			{
				key: 'simple_set',
				name: 'Simple Set',
				type: 'userset',
				conditions: { 'subject.email': { contains: '@example.com' } },
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockRejectedValue(
			new Error('Failed to get user resource'),
		);

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toContain('resource "permitio_user_set" "simple_set"');
		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			expect.stringContaining('Failed to fetch user attributes'),
		);
	});

	it('properly processes string conditions', async () => {
		const mockConditionSets = [
			{
				key: 'string_condition',
				name: 'String Condition',
				type: 'userset',
				conditions: JSON.stringify({
					'subject.email': { contains: '@example.com' },
				}),
				resource_id: null,
			},
		];

		mockPermit.api.conditionSets.list.mockResolvedValue(mockConditionSets);
		mockPermit.api.resources.get.mockResolvedValue({ attributes: {} });

		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toContain('resource "permitio_user_set" "string_condition"');
		expect(result).toContain('subject.email');
		expect(result).toContain('@example.com');
	});
});

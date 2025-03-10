import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSetGenerator } from '../../source/commands/env/export/generators/UserSetGenerator';
import type { WarningCollector } from '../../source/commands/env/export/types';
import { readFileSync } from 'fs';
import { join } from 'path';

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
      conditions = "{{conditions}}"
    }
    {{/each}}
  `),
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
				conditions: '"user.subscription == \\"premium\\""',
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
		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		// Check for header.
		expect(result).toContain('# User Sets');

		// Check first user set.
		expect(result).toContain('resource "permitio_user_set" "us_based"');
		expect(result).toContain('key = "us_based"');
		expect(result).toContain('name = "US Based Users"');
		expect(result).not.toContain('description = "Users from United States"');

		// Since conditions is an object, it will be coerced to "[object Object]".
		expect(result).toContain('conditions = "[object Object]"');

		// Check second user set.
		expect(result).toContain('resource "permitio_user_set" "premium_users"');
		expect(result).toContain('key = "premium_users"');
		expect(result).toContain('name = "Premium Users"');
		expect(result).toContain('resource = "subscription"');
		expect(result).toContain(
			'conditions = "user.subscription &#x3D;&#x3D; &quot;premium&quot;"',
		);

		// Ensure resource set is not included.
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
				conditions: '""',
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
		const generator = new UserSetGenerator(mockPermit, warningCollector);
		const result = await generator.generateHCL();

		expect(result).toBe('');
		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			'User set "empty_conditions" has no valid conditions and will be skipped.',
		);
		expect(warningCollector.addWarning).toHaveBeenCalledWith(
			'User set "null_conditions" has no valid conditions and will be skipped.',
		);
	});
});

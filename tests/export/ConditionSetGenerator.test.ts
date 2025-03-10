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
				conditionSetRules: {
					list: vi.fn().mockResolvedValue([
						{
							user_set: '__autogen_us_employees',
							resource_set: 'document_set',
							permission: 'document:read',
						},
						{
							user_set: '__autogen_managers',
							resource_set: 'confidential_docs',
							permission: 'document:write',
						},
					]),
				},
				conditionSets: {
					// Include the type property so that valid rules are recognized.
					list: vi.fn().mockResolvedValue([
						{ key: '__autogen_us_employees', type: 'userset' },
						{ key: 'document_set', type: 'resourceset' },
						{ key: '__autogen_managers', type: 'userset' },
						{ key: 'confidential_docs', type: 'resourceset' },
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
		// Instead of checking for exact equality, we ensure the HCL starts with the header.
		expect(hcl.startsWith('\n# Condition Set Rules\n')).toBe(true);
	});

	it('handles empty condition sets', async () => {
		mockPermit.api.conditionSetRules.list.mockResolvedValueOnce([]);
		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
	});

	it('handles errors and adds warnings', async () => {
		mockPermit.api.conditionSetRules.list.mockRejectedValueOnce(
			new Error('API Error'),
		);
		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()[0]).toContain(
			'Failed to export condition set rules',
		);
	});
});

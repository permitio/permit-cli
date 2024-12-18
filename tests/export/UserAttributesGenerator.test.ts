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
				resourceAttributes: {
					list: vi.fn().mockResolvedValue([
						{
							key: 'department',
							type: 'string',
							description: 'User department',
						},
						{
							key: 'age',
							type: 'number',
						},
					]),
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

		expect(hcl).toContain('resource "permitio_user_attribute" "department"');
		expect(hcl).toContain('resource "permitio_user_attribute" "age"');
		expect(hcl).toContain('type = "string"');
		expect(hcl).toContain('type = "number"');
		expect(hcl).toContain('description = "User department"');
	});

	it('handles empty attributes list', async () => {
		mockPermit.api.resourceAttributes.list.mockResolvedValueOnce([]);
		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
	});

	it('generates HCL without description for attributes missing it', async () => {
		mockPermit.api.resourceAttributes.list.mockResolvedValueOnce([
			{
				key: 'simple',
				type: 'string',
			},
		]);

		const hcl = await generator.generateHCL();
		expect(hcl).toContain('resource "permitio_user_attribute" "simple"');
		expect(hcl).not.toContain('description');
	});

	it('handles API errors', async () => {
		mockPermit.api.resourceAttributes.list.mockRejectedValueOnce(
			new Error('API Error'),
		);
		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()[0]).toContain(
			'Failed to export user attributes',
		);
	});
});

import { describe, it, expect, vi } from 'vitest';
import { RoleGenerator } from '../../source/commands/env/export/generators/RoleGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('RoleGenerator', () => {
	const mockPermit = {
		api: {
			roles: {
				list: vi.fn().mockResolvedValue([
					{
						key: 'admin',
						name: 'Administrator',
						description: 'Admin role',
						permissions: ['document:read', 'document:write'],
						extends: ['viewer'], // This will be ignored in the HCL output
					},
				]),
			},
		},
	};

	it('generates valid HCL for roles', async () => {
		const generator = new RoleGenerator(
			mockPermit as any,
			createWarningCollector(),
		);
		const hcl = await generator.generateHCL();

		expect(hcl).toContain('resource "permitio_role" "admin"');
		expect(hcl).toContain('  key  = "admin"');
		expect(hcl).toContain('  name = "Administrator"');
		expect(hcl).toContain('  description = "Admin role"');
		expect(hcl).toContain('["document:read","document:write"]');
		expect(hcl).not.toContain('["viewer"]'); // Ensure "viewer" is not included
	});

	it('handles API errors gracefully', async () => {
		const errorMockPermit = {
			api: {
				roles: {
					list: vi.fn().mockRejectedValue(new Error('API Error')),
				},
			},
		};
		const warningCollector = createWarningCollector();
		const generator = new RoleGenerator(
			errorMockPermit as any,
			warningCollector,
		);
		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()).toContain(
			'Failed to export roles: Error: API Error',
		);
	});
});
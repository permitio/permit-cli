import { expect, describe, it, beforeEach } from 'vitest';
import { Permit } from 'permitio';
import { ResourceGenerator } from '../../source/commands/env/export/generators/ResourceGenerator';
import { RoleGenerator } from '../../source/commands/env/export/generators/RoleGenerator';
import { UserAttributesGenerator } from '../../source/commands/env/export/generators/UserAttributesGenerator';
import {
	getMockPermit,
	mockResources,
	mockRoles,
	mockUserAttributes,
} from './mocks/permit';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('Generators', () => {
	let permit: Permit;
	let warningCollector: ReturnType<typeof createWarningCollector>;

	beforeEach(() => {
		permit = getMockPermit() as any;
		warningCollector = createWarningCollector();
	});

	describe('ResourceGenerator', () => {
		it('generates valid HCL for resources', async () => {
			const generator = new ResourceGenerator(permit, warningCollector);
			const hcl = await generator.generateHCL();

			expect(hcl).toContain('resource "permitio_resource"');
			expect(hcl).toContain(mockResources[0].key);
			expect(hcl).toContain(mockResources[0].name);
		});
	});

	describe('RoleGenerator', () => {
		it('generates valid HCL for roles', async () => {
			const generator = new RoleGenerator(permit, warningCollector);
			const hcl = await generator.generateHCL();

			expect(hcl).toContain('resource "permitio_role"');
			expect(hcl).toContain(mockRoles[0].key);
			expect(hcl).toContain(mockRoles[0].name);
		});
	});

	describe('UserAttributesGenerator', () => {
		it('generates valid HCL for user attributes', async () => {
			const generator = new UserAttributesGenerator(permit, warningCollector);
			const hcl = await generator.generateHCL();

			expect(hcl).toContain('resource "permitio_user_attribute"');
			expect(hcl).toContain(mockUserAttributes[0].key);
			expect(hcl).toContain(mockUserAttributes[0].type);
		});
	});
});

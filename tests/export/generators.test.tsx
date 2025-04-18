import { expect, describe, it, beforeEach, vi } from 'vitest';
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
			const mockResourcesWithRoles = [
				{
					key: 'document',
					name: 'Document',
					roles: {
						custom_admin: {
							name: 'Administrator',
							permissions: ['document:read'],
						},
					},
				},
			];

			const mockPermitWithRoles = {
				api: {
					...permit.api,
					resources: {
						list: vi.fn().mockResolvedValue(mockResourcesWithRoles),
					},
					roles: {
						list: vi.fn().mockResolvedValue([
							{
								key: 'user',
								name: 'User',
								description: 'Application user',
							},
						]),
					},
				},
			};

			const generator = new RoleGenerator(
				mockPermitWithRoles as any,
				warningCollector,
			);
			const hcl = await generator.generateHCL();

			expect(hcl).toContain('resource "permitio_role"');
			expect(hcl).toContain('user');
			// Expect the resource-specific role key (custom_admin) to be present.
			expect(hcl).toContain('custom_admin');
		});
	});

	describe('UserAttributesGenerator', () => {
		it('generates valid HCL for user attributes', async () => {
			// Ensure that permit.api.resources exists and define its "get" method.
			if (!permit.api.resources) {
				permit.api.resources = {};
			}
			permit.api.resources.get = vi.fn().mockResolvedValue({
				attributes: {
					[mockUserAttributes[0].key]: mockUserAttributes[0],
				},
			});
			const generator = new UserAttributesGenerator(permit, warningCollector);
			const hcl = await generator.generateHCL();
			expect(hcl).toContain('resource "permitio_user_attribute"');
			expect(hcl).toContain(mockUserAttributes[0].key);
			expect(hcl).toContain(mockUserAttributes[0].type);
		});
	});
});

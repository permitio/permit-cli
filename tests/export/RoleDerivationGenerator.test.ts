import { describe, it, expect, vi } from 'vitest';
import { RoleDerivationGenerator } from '../../source/commands/env/export/generators/RoleDerivationGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';
import Handlebars from 'handlebars';

// Mock file system operations
vi.mock('fs', () => ({
	readFileSync: vi.fn().mockReturnValue(`{{#each derivations}}
resource "permitio_role_derivation" "{{id}}" {
  resource    = "{{resource}}"
  role        = "{{role}}"
  linked_by   = "{{linked_by}}"
  on_resource = "{{on_resource}}"
  to_role     = "{{to_role}}"
  {{#if dependencies}}
  depends_on  = {{{json dependencies}}}
  {{/if}}
}
{{/each}}`),
}));

// Register JSON helper for Handlebars
Handlebars.registerHelper('json', context => JSON.stringify(context));

// Define an interface for the Permit client
interface PermitClient {
	api: {
		resources: { list: () => Promise<any[]> };
		resourceRoles: { list: () => Promise<any[]> };
		resourceRelations: { list: () => Promise<any[]> };
	};
}

// Update createMockPermit to return a PermitClient
const createMockPermit = ({
	resources = [],
	resourceRoles = [],
	resourceRelations = [],
	resourcesError = null,
	rolesError = null,
	relationsError = null,
}: {
	resources?: any[];
	resourceRoles?: any[];
	resourceRelations?: any[];
	resourcesError?: Error | null;
	rolesError?: Error | null;
	relationsError?: Error | null;
} = {}): PermitClient => ({
	api: {
		resources: {
			list: resourcesError
				? vi.fn().mockRejectedValue(resourcesError)
				: vi.fn().mockResolvedValue(resources),
		},
		resourceRoles: {
			list: rolesError
				? vi.fn().mockRejectedValue(rolesError)
				: vi.fn().mockResolvedValue(resourceRoles),
		},
		resourceRelations: {
			list: relationsError
				? vi.fn().mockRejectedValue(relationsError)
				: vi.fn().mockResolvedValue(resourceRelations),
		},
	},
});

describe('RoleDerivationGenerator', () => {
	it('generates valid HCL for role derivations', async () => {
		const mockPermit = createMockPermit({
			resources: [{ id: 'res1', key: 'document' }],
			resourceRoles: [
				{
					id: 'role1',
					key: 'document_user',
					resource: 'document',
					name: 'User',
					granted_to: {
						users_with_role: [
							{
								role: 'document_user',
								on_resource: 'document',
								linked_by_relation: 'parent',
							},
						],
					},
				},
			],
			resourceRelations: [
				{
					key: 'parent',
					subject_resource: 'document',
					object_resource: 'document',
				},
			],
		});

		const generator = new RoleDerivationGenerator(
			mockPermit,
			createWarningCollector(),
		);
		const hcl = await generator.generateHCL();

		expect(hcl).toContain('# Role Derivations');
		expect(hcl).toContain('resource "permitio_role_derivation"');
		expect(hcl).toContain('resource    = "document"');
		expect(hcl).toContain('role        = "document__document_user"');
	});

	it('handles resources with missing keys', async () => {
		const mockPermitWithInvalidResource = createMockPermit({
			resources: [{ id: 'res1' }], // missing key
			resourceRoles: [],
			resourceRelations: [],
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleDerivationGenerator(
			mockPermitWithInvalidResource,
			warningCollector,
		);
		const hcl = await generator.generateHCL();

		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()).toHaveLength(0);
	});

	it('handles API errors gracefully', async () => {
		const errorMockPermit = createMockPermit({
			resourcesError: new Error('API Error'),
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleDerivationGenerator(
			errorMockPermit,
			warningCollector,
		);
		const hcl = await generator.generateHCL();

		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()).toContain(
			'Failed to fetch resources: Error: API Error',
		);
	});

	it('handles empty resources list', async () => {
		const emptyMockPermit = createMockPermit({ resources: [] });
		const generator = new RoleDerivationGenerator(
			emptyMockPermit,
			createWarningCollector(),
		);
		const hcl = await generator.generateHCL();

		expect(hcl).toBe('');
	});

	it('handles role derivation list errors', async () => {
		const mockPermitWithDerivationError = createMockPermit({
			resources: [{ id: 'res1', key: 'document' }],
			rolesError: new Error('Derivation API Error'),
			resourceRelations: [],
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleDerivationGenerator(
			mockPermitWithDerivationError,
			warningCollector,
		);
		await generator.generateHCL();

		expect(warningCollector.getWarnings()).toContain(
			"Failed to process roles for resource 'document': Error: Derivation API Error",
		);
	});

	it('handles relation mapping when Terraform IDs are not found', async () => {
		const mockPermitWithUnmappedRelations = createMockPermit({
			resources: [
				{ id: 'res1', key: 'document' },
				{ id: 'res2', key: 'folder' },
			],
			resourceRoles: [
				{
					id: 'role1',
					key: 'document_user',
					resource: 'document',
					name: 'User',
					granted_to: {
						users_with_role: [
							{
								role: 'folder_user',
								on_resource: 'folder',
								linked_by_relation: 'unknown_relation',
							},
						],
					},
				},
			],
			resourceRelations: [],
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleDerivationGenerator(
			mockPermitWithUnmappedRelations,
			warningCollector,
		);

		generator.setRelationIdMap(new Map());
		generator.setRoleIdMap(
			new Map([
				['document:document_user', 'document__document_user'],
				['folder:folder_user', 'folder__folder_user'],
			]),
		);

		const hcl = await generator.generateHCL();

		expect(hcl.length).toBeGreaterThan(0);
		expect(warningCollector.getWarnings().some(w => w.includes('Error'))).toBe(
			false,
		);
	});

	it('handles role mapping when Terraform IDs are not found', async () => {
		const mockPermitWithUnmappedRoles = createMockPermit({
			resources: [{ id: 'res1', key: 'document' }],
			resourceRoles: [
				{
					id: 'role1',
					key: 'unmapped_role',
					resource: 'document',
					name: 'Unmapped Role',
					granted_to: {
						users_with_role: [
							{
								role: 'other_unmapped_role',
								on_resource: 'document',
								linked_by_relation: 'parent',
							},
						],
					},
				},
			],
			resourceRelations: [
				{
					key: 'parent',
					subject_resource: 'document',
					object_resource: 'document',
				},
			],
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleDerivationGenerator(
			mockPermitWithUnmappedRoles,
			warningCollector,
		);

		generator.setRoleIdMap(new Map());
		generator.setRelationIdMap(
			new Map([['document:parent:document', 'parent']]),
		);

		const hcl = await generator.generateHCL();

		expect(
			warningCollector.getWarnings().some(w => w.includes('Role ID not found')),
		).toBe(true);
	});
});

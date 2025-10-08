import { describe, it, expect, vi } from 'vitest';
import { RoleGenerator } from '../../source/commands/env/export/generators/RoleGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';

// Define an interface for the Permit client
interface PermitClient {
	api: {
		resources: { list: () => Promise<any[]> };
		roles: { list: () => Promise<any[]> };
	};
}

// Helper function to create a mock Permit client
const createMockPermit = ({
	resources = [],
	roles = [],
	resourcesError = null,
	rolesError = null,
}: {
	resources?: any[];
	roles?: any[];
	resourcesError?: Error | null;
	rolesError?: Error | null;
} = {}): PermitClient => ({
	api: {
		resources: {
			list: resourcesError
				? vi.fn().mockRejectedValue(resourcesError)
				: vi.fn().mockResolvedValue(resources),
		},
		roles: {
			list: rolesError
				? vi.fn().mockRejectedValue(rolesError)
				: vi.fn().mockResolvedValue(roles),
		},
	},
});

describe('RoleGenerator', () => {
	const mockPermit = createMockPermit({
		resources: [
			{
				key: 'document',
				roles: {
					admin: {
						name: 'Administrator',
						description: 'Admin role',
						permissions: ['document:read', 'document:write'],
					},
				},
			},
		],
		roles: [
			{
				key: 'user',
				name: 'Basic User',
				description: 'Basic user role',
				permissions: [],
			},
		],
	});

	it('generates valid HCL for roles', async () => {
		const generator = new RoleGenerator(mockPermit, createWarningCollector());
		const hcl = await generator.generateHCL();

		// Basic structure checks
		expect(hcl).toContain('# Roles');
		expect(hcl).toContain('resource "permitio_role" "user"');
		expect(hcl).toContain('key');
		expect(hcl).toContain('name');
		expect(hcl).toContain('Basic User');

		expect(hcl).toContain('user');
		expect(hcl).toContain('Basic User');
		expect(hcl).toContain('Basic user role');
	});

	it('handles empty role lists', async () => {
		const emptyMockPermit = createMockPermit({
			resources: [],
			roles: [],
		});

		const generator = new RoleGenerator(
			emptyMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
	});

	it('handles API errors gracefully', async () => {
		const errorMockPermit = createMockPermit({
			resourcesError: new Error('API Error'),
			rolesError: new Error('API Error'),
		});

		const warningCollector = createWarningCollector();
		const generator = new RoleGenerator(errorMockPermit, warningCollector);

		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
		expect(warningCollector.getWarnings()).toContain(
			'Failed to fetch data from Permit API: Error: API Error',
		);
	});

	it('exports default roles', async () => {
		const defaultRolesMockPermit = createMockPermit({
			resources: [
				{
					key: 'document',
					roles: {
						admin: { name: 'Admin', permissions: ['document:read'] },
						editor: { name: 'Editor', permissions: ['document:write'] },
						viewer: { name: 'Viewer', permissions: ['document:read'] },
					},
				},
			],
			roles: [
				{
					key: 'admin',
					name: 'Admin',
					permissions: ['document:read', 'document:write', 'document:delete'],
				},
				{
					key: 'editor',
					name: 'Editor',
					permissions: ['document:read', 'document:write'],
				},
				{ key: 'viewer', name: 'Viewer', permissions: ['document:read'] },
				{ key: 'custom', name: 'Custom Role' },
			],
		});

		const generator = new RoleGenerator(
			defaultRolesMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();
		// Verify default roles are exported
		expect(hcl).toContain('resource "permitio_role" "viewer"');
		expect(hcl).toContain('resource "permitio_role" "editor"');
		expect(hcl).toContain('resource "permitio_role" "admin"');
		expect(hcl).toContain('resource "permitio_role" "custom"');

		// Verify default roles include their actual permissions (they can differ from defaults)
		expect(hcl).toContain('document:delete'); // admin has delete permission
		expect(hcl).toContain('document:write'); // editor has write permission
	});

	it('handles role dependencies correctly', async () => {
		const dependencyMockPermit = createMockPermit({
			resources: [
				{
					key: 'document',
					roles: {
						writer: {
							name: 'Writer',
							permissions: ['document:write'],
							extends: ['reader'],
						},
						reader: {
							name: 'Reader',
							permissions: ['document:read'],
						},
					},
				},
			],
			roles: [
				{
					key: 'parent_role',
					name: 'Parent Role',
				},
				{
					key: 'child_role',
					name: 'Child Role',
					extends: ['parent_role'],
				},
			],
		});

		const generator = new RoleGenerator(
			dependencyMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		// Check standalone roles exist
		expect(hcl).toContain('resource "permitio_role" "parent_role"');
		expect(hcl).toContain('resource "permitio_role" "child_role"');

		// Check resource roles exist
		expect(hcl).toContain('resource "permitio_role" "writer"');
		expect(hcl).toContain('resource "permitio_role" "reader"');

		expect(hcl).toContain('permitio_role.parent_role');
		expect(hcl).toContain('permitio_role.reader');
		expect(hcl).toContain('permitio_resource.document');
	});

	it('handles roles with attributes correctly', async () => {
		const attributeMockPermit = createMockPermit({
			resources: [],
			roles: [
				{
					key: 'role_with_attributes',
					name: 'Role With Attributes',
					attributes: {
						department: 'engineering',
						level: 2,
						isActive: true,
					},
				},
			],
		});

		const generator = new RoleGenerator(
			attributeMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		// Check role with attributes
		expect(hcl).toContain('resource "permitio_role" "role_with_attributes"');
		expect(hcl).toContain('attributes');
		expect(hcl).toContain('department');
		expect(hcl).toContain('engineering');
		expect(hcl).toContain('level');
		expect(hcl).toContain('isActive');
	});

	it('handles resource dependencies in permissions correctly', async () => {
		const permissionsMockPermit = createMockPermit({
			resources: [{ key: 'document' }, { key: 'folder' }],
			roles: [
				{
					key: 'multi_resource_role',
					name: 'Multi Resource Role',
					permissions: ['document:read', 'folder:write'],
				},
			],
		});

		const generator = new RoleGenerator(
			permissionsMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		// Check for role with multi-resource permissions
		expect(hcl).toContain('resource "permitio_role" "multi_resource_role"');
		expect(hcl).toContain('permissions = ["document:read", "folder:write"]');
		// Check for dependencies without exact formatting
		expect(hcl).toContain('depends_on');
		expect(hcl).toContain('permitio_resource.document');
		expect(hcl).toContain('permitio_resource.folder');
	});

	it('handles duplicate role keys correctly', async () => {
		const duplicateKeysMockPermit = createMockPermit({
			resources: [
				{
					key: 'resource1',
					roles: {
						manager: { name: 'Resource 1 Manager' },
					},
				},
				{
					key: 'resource2',
					roles: {
						manager: { name: 'Resource 2 Manager' },
					},
				},
			],
			roles: [{ key: 'manager', name: 'Global Manager' }],
		});

		const generator = new RoleGenerator(
			duplicateKeysMockPermit,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		// Check that resource-specific roles use different IDs
		expect(hcl).toContain('resource "permitio_role" "resource1__manager"');
		expect(hcl).toContain('resource "permitio_role" "resource2__manager"');
		// Global role uses the plain key since it's defined as a standalone role
		expect(hcl).toContain('resource "permitio_role" "manager"');
		// Verify content to ensure it's the global manager
		expect(hcl).toContain('name        = "Global Manager"');
	});
});

import { describe, it, expect, vi } from 'vitest';
import { RoleGenerator } from '../../source/commands/env/export/generators/RoleGenerator.js';
import { createWarningCollector } from '../../source/commands/env/export/utils';

describe('RoleGenerator', () => {
	const mockPermit = {
		api: {
			resources: {
				list: vi.fn().mockResolvedValue([
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
				]),
			},
			roles: {
				list: vi.fn().mockResolvedValue([
					{
						key: 'user',
						name: 'Basic User',
						description: 'Basic user role',
						permissions: [],
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

		// Debug output - uncomment if needed
		// console.log(hcl);

		// Basic structure checks
		expect(hcl).toContain('# Roles');

		// Check for standalone roles
		expect(hcl).toContain('resource "permitio_role" "user"');
		expect(hcl).toContain('key');
		expect(hcl).toContain('name');
		expect(hcl).toContain('Basic User');

		expect(hcl).toContain('user');
		expect(hcl).toContain('Basic User');
		expect(hcl).toContain('Basic user role');
	});

	it('handles empty role lists', async () => {
		const emptyMockPermit = {
			api: {
				resources: {
					list: vi.fn().mockResolvedValue([]),
				},
				roles: {
					list: vi.fn().mockResolvedValue([]),
				},
			},
		};

		const generator = new RoleGenerator(
			emptyMockPermit as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();
		expect(hcl).toBe('');
	});

	it('handles API errors gracefully', async () => {
		const errorMockPermit = {
			api: {
				resources: {
					list: vi.fn().mockRejectedValue(new Error('API Error')),
				},
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

	it('filters out default roles', async () => {
		const defaultRolesMockPermit = {
			api: {
				resources: {
					list: vi.fn().mockResolvedValue([
						{
							key: 'document',
							roles: {
								admin: { name: 'Admin', permissions: ['document:read'] },
								editor: { name: 'Editor', permissions: ['document:write'] },
								viewer: { name: 'Viewer', permissions: ['document:read'] },
							},
						},
					]),
				},
				roles: {
					list: vi.fn().mockResolvedValue([
						{ key: 'admin', name: 'Admin' },
						{ key: 'editor', name: 'Editor' },
						{ key: 'viewer', name: 'Viewer' },
						{ key: 'custom', name: 'Custom Role' },
					]),
				},
			},
		};

		const generator = new RoleGenerator(
			defaultRolesMockPermit as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();
		expect(hcl).not.toContain('resource "permitio_role" "viewer"');
		expect(hcl).not.toContain('resource "permitio_role" "editor"');
		expect(hcl).not.toContain('resource "permitio_role" "admin"');
		expect(hcl).toContain('resource "permitio_role" "custom"');
	});

	it('handles role dependencies correctly', async () => {
		const dependencyMockPermit = {
			api: {
				resources: {
					list: vi.fn().mockResolvedValue([
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
					]),
				},
				roles: {
					list: vi.fn().mockResolvedValue([
						{
							key: 'parent_role',
							name: 'Parent Role',
						},
						{
							key: 'child_role',
							name: 'Child Role',
							extends: ['parent_role'],
						},
					]),
				},
			},
		};

		const generator = new RoleGenerator(
			dependencyMockPermit as any,
			createWarningCollector(),
		);

		const hcl = await generator.generateHCL();

		// Debug output - uncomment if needed
		// console.log(hcl);

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
});

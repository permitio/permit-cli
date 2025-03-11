import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define default global roles that should be excluded from creation
// These roles already exist in Permit by default
const DEFAULT_GLOBAL_ROLES = ['admin', 'editor', 'viewer'];

interface RoleData {
	key: string;
	terraformId: string;
	name: string;
	resource?: string;
	permissions: string[];
	extends?: string[];
	dependencies: string[];
	description?: string;
	attributes?: Record<string, unknown>;
}

// Interface representing a role from the Permit API
interface RoleFromAPI {
	key: string;
	name?: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, unknown>;
}

// Define a role data structure from the Permit API resource roles
interface RoleDataFromAPI {
	name?: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, unknown>;
}

export class RoleGenerator implements HCLGenerator {
	name = 'roles';
	private template: TemplateDelegate<{ roles: RoleData[] }>;
	// This map will track the role key to terraform ID mapping
	private roleIdMap = new Map<string, string>();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		// Register Handlebars helpers
		Handlebars.registerHelper('json', function (context: string[] | unknown) {
			if (Array.isArray(context)) {
				return `[${context.map(item => `"${item}"`).join(', ')}]`;
			}
			return JSON.stringify(context);
		});

		// Helper to properly format an array of strings for Terraform
		Handlebars.registerHelper('permissionsArray', function (arr: string[]) {
			if (!arr || arr.length === 0) return '[]';
			return `[${arr.map(item => `"${item}"`).join(', ')}]`;
		});

		Handlebars.registerHelper(
			'attributes',
			function (context: Record<string, unknown>) {
				if (!context) return '';
				const entries = Object.entries(context);
				if (entries.length === 0) return '';

				return `\n  attributes = {
    ${entries.map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n    ')}
  }`;
			},
		);

		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/role.hcl'), 'utf-8'),
		);
	}

	// Method to get the role ID mapping
	public getRoleIdMap(): Map<string, string> {
		return this.roleIdMap;
	}

	async generateHCL(): Promise<string> {
		try {
			// Track used terraform IDs to detect duplicates
			const usedTerraformIds = new Set<string>();
			// Map from role key to count of occurrences
			const roleKeyCount = new Map<string, number>();

			// Fetch roles and resources from Permit API
			const [rolesResponse, resourcesResponse] = await Promise.all([
				this.permit.api.roles.list(),
				this.permit.api.resources.list(),
			]);

			// Prepare roles array and ensure it's valid
			const roles = Array.isArray(rolesResponse) ? rolesResponse : [];
			const resources = Array.isArray(resourcesResponse)
				? resourcesResponse
				: [];

			if (roles.length === 0 && resources.length === 0) {
				return '';
			}

			// First, count occurrences of all role keys to identify potential duplicates
			const countRoleKey = (key: string) => {
				roleKeyCount.set(key, (roleKeyCount.get(key) || 0) + 1);
			};

			// Count standalone roles
			for (const role of roles) {
				countRoleKey(role.key);
			}

			// Count resource roles
			for (const resource of resources) {
				if (!resource.roles || typeof resource.roles !== 'object') continue;

				Object.keys(resource.roles).forEach(roleKey => {
					countRoleKey(roleKey);
				});
			}

			// Prepare to collect all valid roles
			const validRoles: RoleData[] = [];

			// Build a map of resource keys to resource objects for dependency tracking
			const resourceMap = new Map();
			resources.forEach(resource => {
				resourceMap.set(resource.key, resource);
			});

			// First process resource-specific roles
			const resourceRoles: Array<{
				resourceKey: string;
				roleKey: string;
				roleData: RoleDataFromAPI;
			}> = [];

			for (const resource of resources) {
				const resourceKey = resource.key;

				if (!resource.roles || typeof resource.roles !== 'object') {
					continue;
				}

				Object.entries(resource.roles).forEach(([roleKey, roleData]) => {
					resourceRoles.push({
						resourceKey,
						roleKey,
						roleData: roleData as RoleDataFromAPI,
					});
				});
			}

			// Then process them in a consistent order by resource key
			const sortedResourceRoles = resourceRoles.sort((a, b) => {
				return a.resourceKey.localeCompare(b.resourceKey);
			});

			// Now process the sorted resource roles
			for (const { resourceKey, roleKey, roleData } of sortedResourceRoles) {
				// Only use double underscore for duplicates or default roles that need distinctive IDs
				const isDuplicate = (roleKeyCount.get(roleKey) ?? 0) > 1;
				const isDefaultRole = DEFAULT_GLOBAL_ROLES.includes(roleKey);

				// Use simple key if it's unique and not a default role
				let terraformId = roleKey;

				// For duplicate roles or default roles, use resource__role format
				if (isDuplicate || isDefaultRole || usedTerraformIds.has(roleKey)) {
					terraformId = `${resourceKey}__${roleKey}`;
				}

				// Track the terraform ID we're using
				usedTerraformIds.add(terraformId);

				// Store the mapping for both resource-specific role key and the plain key
				this.roleIdMap.set(`${resourceKey}:${roleKey}`, terraformId);

				// For default roles, we need special handling for the tenant:admin and board:admin cases
				if (resourceKey === 'tenant' && roleKey === 'admin') {
					this.roleIdMap.set('tenant:admin', 'tenant__admin');
				} else if (resourceKey === 'board' && roleKey === 'admin') {
					this.roleIdMap.set('board:admin', 'board__admin');
				}

				// Only map the plain key if it's not a duplicate or already mapped
				if (!isDuplicate && !this.roleIdMap.has(roleKey)) {
					this.roleIdMap.set(roleKey, terraformId);
				}

				// Extract permissions as strings only
				let permissions: string[] = [];
				if (roleData.permissions && Array.isArray(roleData.permissions)) {
					permissions = roleData.permissions.map(p => String(p));
				}

				// All resource roles depend on their resource
				const dependencies = [`permitio_resource.${resourceKey}`];

				// Add the resource role
				validRoles.push({
					key: roleKey,
					terraformId,
					name: roleData.name || roleKey,
					resource: resourceKey,
					permissions,
					extends: roleData.extends?.map(e => String(e)),
					dependencies,
					description: roleData.description,
					attributes: roleData.attributes,
				});
			}

			// Now process global roles - these reference resources in their permissions
			for (const role of roles) {
				// Skip default global roles that already exist in the system
				if (DEFAULT_GLOBAL_ROLES.includes(role.key)) {
					// Still add to the ID map for role derivations
					this.roleIdMap.set(role.key, role.key);
					continue; // Skip exporting these roles
				}

				// Use simple key for terraform ID if it's not already used
				let terraformId = role.key;

				// If the ID is already used, prefix it with "global_"
				if (usedTerraformIds.has(terraformId)) {
					terraformId = `global_${role.key}`;
				}

				// Store the mapping
				this.roleIdMap.set(role.key, terraformId);
				usedTerraformIds.add(terraformId);

				// Build dependencies for resources mentioned in permissions
				const dependencies: string[] = [];

				// For global roles, we need to ensure all resources referenced in permissions exist first
				if (role.permissions && Array.isArray(role.permissions)) {
					role.permissions.forEach(perm => {
						// Check if permission has resource:action format
						const parts = typeof perm === 'string' ? perm.split(':') : [];
						if (parts.length === 2) {
							const resourceKey = parts[0];
							// Add resource as dependency if it exists
							if (resourceMap.has(resourceKey)) {
								const depRef = `permitio_resource.${resourceKey}`;
								if (!dependencies.includes(depRef)) {
									dependencies.push(depRef);
								}
							}
						}
					});
				}

				// Cast the role to our RoleFromAPI interface to access the extends property
				const typedRole = role as unknown as RoleFromAPI;

				validRoles.push({
					key: role.key,
					terraformId,
					name: role.name || role.key,
					description: role.description,
					permissions: (role.permissions || []).map(p => String(p)),
					extends: (typedRole.extends || []).map(e => String(e)),
					attributes: role.attributes as Record<string, unknown> | undefined,
					dependencies: dependencies,
				});
			}

			// Process role extension dependencies
			for (const role of validRoles) {
				if (!role.extends || role.extends.length === 0) continue;

				// For each extended role, add a dependency
				for (const extendedRole of role.extends) {
					// If this is a resource role, we need to check for the resource-specific role key
					let extendedRoleTerraformId: string | undefined;

					if (role.resource) {
						// First check if there's a resource-specific role with this key
						const resourceSpecificKey = `${role.resource}:${extendedRole}`;
						extendedRoleTerraformId = this.roleIdMap.get(resourceSpecificKey);
					}

					// If we didn't find a resource-specific role, check for standalone role
					if (!extendedRoleTerraformId) {
						extendedRoleTerraformId = this.roleIdMap.get(extendedRole);
					}

					// If we found the role, add a dependency
					if (extendedRoleTerraformId) {
						const ref = `permitio_role.${extendedRoleTerraformId}`;
						if (!role.dependencies.includes(ref)) {
							role.dependencies.push(ref);
						}
					}
				}
			}

			// Render template with all processed roles
			const result = '\n# Roles\n' + this.template({ roles: validRoles });
			return result;
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export roles: ${error}`);
			return '';
		}
	}
}

import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Role data structure from API
interface RoleDataFromAPI {
	name?: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, unknown>;
}

// Interface for roles returned from API
interface PermitRole {
	key: string;
	name: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, unknown>;
}

// Interface for resources returned from API
interface PermitResource {
	key: string;
	name: string;
	roles?: Record<string, RoleDataFromAPI>;
}

// Interface for API response data
interface PermitData {
	roles: PermitRole[];
	resources: PermitResource[];
}

export class RoleGenerator implements HCLGenerator {
	name = 'roles';
	private template: TemplateDelegate<{ roles: RoleData[] }>;
	// This map will track the role key to terraform ID mapping
	private roleIdMap = new Map<string, string>();
	// Track used terraform IDs to detect duplicates
	private usedTerraformIds = new Set<string>();
	// Map from role key to count of occurrences
	private roleKeyCount = new Map<string, number>();
	// Resource map for dependency tracking
	private resourceMap = new Map<string, PermitResource>();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		// Register Handlebars helpers
		this.registerHandlebarsHelpers();
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/role.hcl'), 'utf-8'),
		);
	}

	// Register all Handlebars helpers
	private registerHandlebarsHelpers(): void {
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
	}

	// Method to get the role ID mapping
	public getRoleIdMap(): Map<string, string> {
		return this.roleIdMap;
	}

	// Fetch data from Permit API
	private async fetchPermitData(): Promise<PermitData> {
		try {
			const [rolesResponse, resourcesResponse] = await Promise.all([
				this.permit.api.roles.list(),
				this.permit.api.resources.list(),
			]);

			// Prepare roles array and ensure it's valid
			const roles = Array.isArray(rolesResponse)
				? (rolesResponse as PermitRole[])
				: [];
			const resources = Array.isArray(resourcesResponse)
				? (resourcesResponse as PermitResource[])
				: [];

			return { roles, resources };
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to fetch data from Permit API: ${error}`,
			);
			return { roles: [], resources: [] };
		}
	}

	// Count occurrences of role keys to identify potential duplicates
	private countRoleKeyOccurrences(
		roles: PermitRole[],
		resources: PermitResource[],
	): void {
		this.roleKeyCount.clear();

		// Helper to increment the count for a key
		const countRoleKey = (key: string) => {
			this.roleKeyCount.set(key, (this.roleKeyCount.get(key) || 0) + 1);
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
	}

	// Build a map of resource keys to resource objects for dependency tracking
	private buildResourceMap(resources: PermitResource[]): void {
		this.resourceMap.clear();
		resources.forEach(resource => {
			if (resource.key) {
				this.resourceMap.set(resource.key, resource);
			}
		});
	}

	// Generate Terraform ID for a role
	private generateTerraformId(
		roleKey: string,
		resourceKey?: string,
		isDuplicate = false,
	): string {
		let terraformId = roleKey;

		// For duplicate roles, use resource__role format
		if (isDuplicate || this.usedTerraformIds.has(roleKey)) {
			terraformId = resourceKey
				? `${resourceKey}__${roleKey}`
				: `global_${roleKey}`;
		}

		// Track the terraform ID we're using
		this.usedTerraformIds.add(terraformId);
		return terraformId;
	}

	// Process resource-specific roles
	private processResourceRoles(resources: PermitResource[]): RoleData[] {
		const resourceRoles: Array<{
			resourceKey: string;
			roleKey: string;
			roleData: RoleDataFromAPI;
		}> = [];

		// Collect all resource roles
		for (const resource of resources) {
			const resourceKey = resource.key;
			if (!resourceKey) continue;

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

		// Sort them by resource key for consistent output
		const sortedResourceRoles = resourceRoles.sort((a, b) => {
			return a.resourceKey.localeCompare(b.resourceKey);
		});

		// Process each resource role
		const validRoles: RoleData[] = [];
		for (const { resourceKey, roleKey, roleData } of sortedResourceRoles) {
			// Check if this role key has duplicates
			const isDuplicate = (this.roleKeyCount.get(roleKey) ?? 0) > 1;

			// Generate Terraform ID
			const terraformId = this.generateTerraformId(
				roleKey,
				resourceKey,
				isDuplicate,
			);

			// Map the role ID for future reference
			this.mapRoleId(resourceKey, roleKey, terraformId);

			// Extract permissions as strings only
			let permissions: string[] = [];
			if (roleData.permissions && Array.isArray(roleData.permissions)) {
				permissions = roleData.permissions.map((p: string) => String(p));
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
				extends: roleData.extends?.map((e: string) => String(e)),
				dependencies,
				description: roleData.description,
				attributes: roleData.attributes,
			});
		}

		return validRoles;
	}

	// Handle mapping role IDs for both resource-specific and global roles
	private mapRoleId(
		resourceKey: string | undefined,
		roleKey: string,
		terraformId: string,
	): void {
		if (resourceKey) {
			// Store the mapping for resource-specific role key
			this.roleIdMap.set(`${resourceKey}:${roleKey}`, terraformId);

			// Special handling for tenant:admin and board:admin cases
			if (resourceKey === 'tenant' && roleKey === 'admin') {
				this.roleIdMap.set('tenant:admin', 'tenant__admin');
			} else if (resourceKey === 'board' && roleKey === 'admin') {
				this.roleIdMap.set('board:admin', 'board__admin');
			}
		}

		// Only map the plain key if it's not a duplicate or already mapped
		const isDuplicate = (this.roleKeyCount.get(roleKey) ?? 0) > 1;
		if (!isDuplicate && !this.roleIdMap.has(roleKey)) {
			this.roleIdMap.set(roleKey, terraformId);
		}
	}

	// Process global (non-resource-specific) roles
	private processGlobalRoles(roles: PermitRole[]): RoleData[] {
		const validRoles: RoleData[] = [];

		for (const role of roles) {
			// Generate Terraform ID
			const terraformId = this.generateTerraformId(role.key);

			// Map the role ID
			this.mapRoleId(undefined, role.key, terraformId);

			// Build dependencies for resources mentioned in permissions
			const dependencies = this.buildResourceDependencies(role.permissions);

			validRoles.push({
				key: role.key,
				terraformId,
				name: role.name || role.key,
				description: role.description,
				permissions: (role.permissions || []).map((p: string) => String(p)),
				extends: (role.extends || []).map((e: string) => String(e)),
				attributes: role.attributes as Record<string, unknown> | undefined,
				dependencies,
			});
		}

		return validRoles;
	}

	// Build resource dependencies based on permissions
	private buildResourceDependencies(
		permissions: string[] | undefined,
	): string[] {
		const dependencies: string[] = [];

		if (!permissions || !Array.isArray(permissions)) {
			return dependencies;
		}

		// For global roles, we need to ensure all resources referenced in permissions exist first
		permissions.forEach(perm => {
			// Check if permission has resource:action format
			const parts = typeof perm === 'string' ? perm.split(':') : [];
			if (parts.length === 2) {
				const resourceKey = parts[0];
				// Add resource as dependency if it exists
				if (resourceKey && this.resourceMap.has(resourceKey)) {
					const depRef = `permitio_resource.${resourceKey}`;
					if (!dependencies.includes(depRef)) {
						dependencies.push(depRef);
					}
				}
			}
		});

		return dependencies;
	}

	// Resolve role extension dependencies
	private resolveRoleDependencies(roles: RoleData[]): RoleData[] {
		for (const role of roles) {
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

		return roles;
	}

	async generateHCL(): Promise<string> {
		try {
			// Clear state maps and sets
			this.usedTerraformIds.clear();
			this.roleKeyCount.clear();
			this.resourceMap.clear();
			this.roleIdMap.clear();

			// Fetch data from Permit API
			const { roles, resources } = await this.fetchPermitData();

			// If no data, return empty string
			if (roles.length === 0 && resources.length === 0) {
				return '';
			}

			this.countRoleKeyOccurrences(roles, resources);
			this.buildResourceMap(resources);
			const resourceRoles = this.processResourceRoles(resources);
			const globalRoles = this.processGlobalRoles(roles);

			// Combine all roles
			const allRoles = [...resourceRoles, ...globalRoles];

			// Resolve role extension dependencies
			const rolesWithDependencies = this.resolveRoleDependencies(allRoles);

			// Render template with all processed roles
			return '\n# Roles\n' + this.template({ roles: rolesWithDependencies });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export roles: ${error}`);
			return '';
		}
	}
}

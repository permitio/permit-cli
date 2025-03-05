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

export class RoleGenerator implements HCLGenerator {
	name = 'roles';
	private template: TemplateDelegate<{ roles: RoleData[] }>;
	private usedTerraformIds: Set<string> = new Set();

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

	// Helper method to generate Terraform resource ID
	private generateTerraformId(roleKey: string, resourceKey?: string): string {
		// For most cases, just use the role key as is
		// Add resource prefix only for duplicate simple roles like "editor"
		const simpleRoles = ['editor', 'viewer', 'admin'];

		if (resourceKey && simpleRoles.includes(roleKey)) {
			return `${resourceKey}__${roleKey}`;
		}

		return roleKey;
	}

	// Helper to get the correct role reference for Terraform
	private getRoleTerraformRef(terraformId: string): string {
		return `permitio_role.${terraformId}`;
	}

	// Helper to extract and format permissions
	private extractPermissions(permissions: any[]): string[] {
		if (!permissions || !Array.isArray(permissions)) return [];

		return permissions
			.map(perm => {
				if (typeof perm === 'string') {
					const parts = perm.split(':');
					// If permission format is "resource:action", extract the action
					return parts.length > 1 ? parts[1] : perm;
				}
				return null;
			})
			.filter(Boolean) as string[];
	}

	async generateHCL(): Promise<string> {
		try {
			console.log('Starting role generation...');

			// Reset the used terraform IDs tracking
			this.usedTerraformIds = new Set<string>();

			// Track used terraform IDs to detect duplicates
			const usedTerraformIds = new Set<string>();

			// Fetch roles and resources from Permit API
			const [rolesResponse, resourcesResponse] = await Promise.all([
				this.permit.api.roles.list(),
				this.permit.api.resources.list(),
			]);

			console.log(
				`Fetched ${Array.isArray(rolesResponse) ? rolesResponse.length : 'unknown'} roles and ${Array.isArray(resourcesResponse) ? resourcesResponse.length : 'unknown'} resources`,
			);

			// Prepare roles array and ensure it's valid
			const roles = Array.isArray(rolesResponse) ? rolesResponse : [];
			const resources = Array.isArray(resourcesResponse)
				? resourcesResponse
				: [];

			if (roles.length === 0 && resources.length === 0) {
				console.log('No roles or resources found, returning empty string');
				return '';
			}

			// Prepare to collect all valid roles
			const validRoles: RoleData[] = [];

			// Map to store the terraform ID for each role to handle dependencies
			const roleIdMap = new Map<string, string>();

			// Process standalone roles (non-resource specific)
			console.log('Processing standalone roles...');

			// Define default roles to skip
			const defaultRoleKeys = ['viewer', 'editor', 'admin'];

			for (const roleKey of defaultRoleKeys) {
				const role = roles.find(r => r.key === roleKey);
				if (role) {
					roleIdMap.set(role.key, role.key);
					console.log(`Skipping default role: ${role.key}`);
				}
			}

			// Process non-default standalone roles
			const otherRoles = roles.filter(
				role => !defaultRoleKeys.includes(role.key),
			);
			for (const role of otherRoles) {
				const terraformId = this.generateTerraformId(role.key);
				console.log(
					`Processing standalone role: ${role.key} with terraform ID: ${terraformId}`,
				);

				if (usedTerraformIds.has(terraformId)) {
					console.warn(`Duplicate terraform ID detected: ${terraformId}`);
				}
				usedTerraformIds.add(terraformId);

				roleIdMap.set(role.key, terraformId);

				validRoles.push({
					key: role.key,
					terraformId,
					name: role.name || role.key,
					description: role.description,
					permissions: role.permissions || [],
					extends: role.extends || [],
					attributes: role.attributes,
					dependencies: [],
				});
			}

			// Collect resource roles
			const resourceRoles: Array<{
				resourceKey: string;
				roleKey: string;
				roleData: any;
			}> = [];

			// Sort resources by key for consistent output
			const sortedResources = [...resources].sort((a, b) =>
				a.key.localeCompare(b.key),
			);

			// First collect all resource roles
			for (const resource of sortedResources) {
				const resourceKey = resource.key;

				if (!resource.roles || typeof resource.roles !== 'object') {
					continue;
				}

				Object.entries(resource.roles).forEach(([roleKey, roleData]) => {
					resourceRoles.push({ resourceKey, roleKey, roleData });
				});
			}

			// Filter out default roles from resource roles too
			const filteredResourceRoles = resourceRoles.filter(
				r => !defaultRoleKeys.includes(r.roleKey) || r.roleKey === 'editor',
			);

			// Then process them in a consistent order by resource key
			const sortedResourceRoles = filteredResourceRoles.sort((a, b) => {
				return a.resourceKey.localeCompare(b.resourceKey);
			});

			// Now process the sorted resource roles
			for (const { resourceKey, roleKey, roleData } of sortedResourceRoles) {
				console.log(
					`Processing resource role: ${roleKey} for resource: ${resourceKey}`,
				);

				// Generate a unique terraform ID for this resource-role combination
				const terraformId = this.generateTerraformId(roleKey, resourceKey);
				console.log(
					`Generated terraform ID: ${terraformId} for role ${roleKey} of resource ${resourceKey}`,
				);

				if (usedTerraformIds.has(terraformId)) {
					this.warningCollector.addWarning(
						`Duplicate terraform ID detected: ${terraformId}`,
					);
					// In case of duplicate, force using resource prefix
					const uniqueId = `${resourceKey}__${roleKey}`;
					roleIdMap.set(`${resourceKey}:${roleKey}`, uniqueId);
					console.log(`Using alternative ID: ${uniqueId} due to conflict`);
				} else {
					usedTerraformIds.add(terraformId);
					roleIdMap.set(`${resourceKey}:${roleKey}`, terraformId);
				}

				// Extract and sort permissions alphabetically for consistency
				let permissions: string[] = [];
				if (roleData.permissions && Array.isArray(roleData.permissions)) {
					permissions = this.extractPermissions(roleData.permissions).sort();
				}

				console.log(
					`Role ${roleKey} for resource ${resourceKey} has permissions:`,
					permissions,
				);

				// All resource roles depend on their resource
				const dependencies = [`permitio_resource.${resourceKey}`];

				// Add the resource role
				validRoles.push({
					key: roleKey,
					terraformId,
					name: roleData.name || roleKey,
					resource: resourceKey,
					permissions,
					extends: roleData.extends,
					dependencies,
					description: roleData.description,
					attributes: roleData.attributes,
				});
			}

			// Process role extension dependencies
			console.log('Processing role extension dependencies...');
			for (const role of validRoles) {
				if (!role.extends || role.extends.length === 0) continue;

				// For each extended role, add a dependency
				for (const extendedRole of role.extends) {
					// If this is a resource role, we need to check for the resource-specific role key
					let extendedRoleTerraformId: string | undefined;

					if (role.resource) {
						// First check if there's a resource-specific role with this key
						const resourceSpecificKey = `${role.resource}:${extendedRole}`;
						extendedRoleTerraformId = roleIdMap.get(resourceSpecificKey);
					}

					// If we didn't find a resource-specific role, check for standalone role
					if (!extendedRoleTerraformId) {
						extendedRoleTerraformId = roleIdMap.get(extendedRole);
					}

					// If we found the role, add a dependency
					if (extendedRoleTerraformId) {
						const ref = this.getRoleTerraformRef(extendedRoleTerraformId);
						if (!role.dependencies.includes(ref)) {
							role.dependencies.push(ref);
						}
					}
				}
			}

			console.log(`Generated ${validRoles.length} valid roles`);

			// Render template with all processed roles
			const result = '\n# Roles\n' + this.template({ roles: validRoles });
			console.log('Generated HCL content for roles');
			return result;
		} catch (error) {
			console.error('Error generating roles HCL:', error);
			this.warningCollector.addWarning(`Failed to export roles: ${error}`);
			return '';
		}
	}
}

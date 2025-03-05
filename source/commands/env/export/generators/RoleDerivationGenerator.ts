import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

interface RoleDerivationData {
	id: string;
	role: string;
	on_resource: string;
	to_role: string;
	resource: string;
	linked_by: string;
	dependencies: string[];
}

export class RoleDerivationGenerator implements HCLGenerator {
	name = 'role derivation';
	private template: Handlebars.TemplateDelegate<{
		derivations: RoleDerivationData[];
	}>;

	// Store the relation ID mapping from RelationGenerator
	private relationIdMap = new Map<string, string>();
	// Store the role ID mapping from RoleGenerator
	private roleIdMap = new Map<string, string>();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		const templatePath = join(
			currentDirPath,
			'../templates/role-derivation.hcl',
		);
		const templateContent = readFileSync(templatePath, 'utf-8');
		this.template = Handlebars.compile(templateContent);
	}

	// Method to set relation ID map from RelationGenerator
	public setRelationIdMap(relationIdMap: Map<string, string>): void {
		this.relationIdMap = relationIdMap;
	}

	// Method to set role ID map from RoleGenerator
	public setRoleIdMap(roleIdMap: Map<string, string>): void {
		this.roleIdMap = roleIdMap;
	}

	// Helper method to get the correct Terraform ID for a role
	private getRoleTerraformId(roleKey: string, resourceKey: string): string {
		// First check if we have a specific resource-role mapping
		const resourceRoleKey = `${resourceKey}:${roleKey}`;
		if (this.roleIdMap.has(resourceRoleKey)) {
			return this.roleIdMap.get(resourceRoleKey)!;
		}

		// Then check if we have a general role mapping
		if (this.roleIdMap.has(roleKey)) {
			return this.roleIdMap.get(roleKey)!;
		}

		// If it's a simple role (like editor), use resource__role pattern
		const simpleRoles = ['editor', 'viewer', 'admin'];
		if (simpleRoles.includes(roleKey)) {
			return `${resourceKey}__${roleKey}`;
		}

		// Return the role key as a fallback
		return roleKey;
	}

	// Helper method to find the correct relation Terraform resource name
	private findRelationTerraformName(
		sourceResource: string,
		targetResource: string,
		relationKey: string,
	): string | undefined {
		// Try direct lookup first
		const directKey = `${sourceResource}:${relationKey}:${targetResource}`;
		if (this.relationIdMap.has(directKey)) {
			return this.relationIdMap.get(directKey);
		}

		// Try reverse lookup
		const reverseKey = `${targetResource}:${relationKey}:${sourceResource}`;
		if (this.relationIdMap.has(reverseKey)) {
			return this.relationIdMap.get(reverseKey);
		}

		// Search for a relation with the same objects and relation key
		for (const [key, value] of this.relationIdMap.entries()) {
			const [subject, relation, object] = key.split(':');

			if (
				relation === relationKey &&
				((subject === sourceResource && object === targetResource) ||
					(subject === targetResource && object === sourceResource))
			) {
				return value;
			}
		}

		// Fallback to typical naming patterns
		const possessivePattern = `${targetResource}_${sourceResource}`;
		const normalPattern = `${sourceResource}_${targetResource}`;

		// Use possessive pattern for special relations
		if (['owner', 'part'].includes(relationKey)) {
			return possessivePattern;
		}

		return normalPattern;
	}

	// Helper to create a meaningful derivation ID
	private createDerivationId(
		sourceResourceKey: string,
		sourceRoleKey: string,
		targetResourceKey: string,
		targetRoleKey: string,
	): string {
		// For simple roles like editor, use the resource names with the role names
		const simpleRoles = ['editor', 'viewer', 'admin'];
		if (
			simpleRoles.includes(sourceRoleKey) ||
			simpleRoles.includes(targetRoleKey)
		) {
			return `${sourceResourceKey}_${sourceRoleKey}_to_${targetResourceKey}_${targetRoleKey}`;
		}

		// For more specific roles, just use the role names
		return `${sourceRoleKey}_to_${targetRoleKey}`;
	}

	async generateHCL(): Promise<string> {
		try {
			// Get all resources
			const resources = await this.permit.api.resources.list();
			if (!Array.isArray(resources) || !resources.length) return '';

			const derivations: RoleDerivationData[] = [];
			const processedDerivations = new Set<string>();

			for (const resource of resources) {
				if (!resource.key) continue;

				try {
					// Get roles for this resource
					const roles = await this.permit.api.resourceRoles.list({
						resourceKey: resource.key,
					});

					if (!Array.isArray(roles) || !roles.length) continue;

					for (const role of roles) {
						if (!role.key || !role.granted_to?.users_with_role?.length)
							continue;

						for (const grant of role.granted_to.users_with_role) {
							if (
								!grant.role ||
								!grant.on_resource ||
								!grant.linked_by_relation
							)
								continue;

							const sourceRoleKey = grant.role;
							const sourceResourceKey = grant.on_resource;
							const relationKey = grant.linked_by_relation;
							const targetResourceKey = resource.key;
							const targetRoleKey = role.key;

							// Skip duplicates
							const derivationKey = `${sourceRoleKey}:${sourceResourceKey}:${relationKey}:${targetRoleKey}:${targetResourceKey}`;
							if (processedDerivations.has(derivationKey)) continue;

							// Get the correct Terraform relation resource name
							const relationResourceName = this.findRelationTerraformName(
								sourceResourceKey,
								targetResourceKey,
								relationKey,
							);

							if (!relationResourceName) {
								this.warningCollector.addWarning(
									`Could not determine relation resource name for ${sourceRoleKey} (${sourceResourceKey}) → ${targetRoleKey} (${targetResourceKey}) via ${relationKey}`,
								);
								continue;
							}

							// Get the correct Terraform role IDs
							const sourceTerraformRoleId = this.getRoleTerraformId(
								sourceRoleKey,
								sourceResourceKey,
							);
							const targetTerraformRoleId = this.getRoleTerraformId(
								targetRoleKey,
								targetResourceKey,
							);

							// Create a meaningful derivation ID
							const id = this.createDerivationId(
								sourceResourceKey,
								sourceRoleKey,
								targetResourceKey,
								targetRoleKey,
							);

							// Standard dependencies
							const dependencies = [
								`permitio_role.${sourceTerraformRoleId}`,
								`permitio_resource.${sourceResourceKey}`,
								`permitio_role.${targetTerraformRoleId}`,
								`permitio_resource.${targetResourceKey}`,
								`permitio_relation.${relationResourceName}`,
							];

							// Add this derivation
							derivations.push({
								id,
								role: sourceTerraformRoleId,
								on_resource: sourceResourceKey,
								to_role: targetTerraformRoleId,
								resource: targetResourceKey,
								linked_by: relationResourceName,
								dependencies,
							});

							processedDerivations.add(derivationKey);
						}
					}
				} catch (error) {
					this.warningCollector.addWarning(
						`Failed to process roles for resource '${resource.key}': ${error}`,
					);
				}
			}

			if (!derivations.length) return '';

			return '\n# Role Derivations\n' + this.template({ derivations });
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to generate role derivations: ${error}`,
			);
			return '';
		}
	}
}

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

							// Create a derivation ID based on source and target roles
							const id = `${sourceRoleKey}_${targetRoleKey}`;

							// Standard dependencies
							const dependencies = [
								`permitio_role.${sourceRoleKey}`,
								`permitio_resource.${sourceResourceKey}`,
								`permitio_role.${targetRoleKey}`,
								`permitio_resource.${targetResourceKey}`,
								`permitio_relation.${relationResourceName}`,
							];

							// Add this derivation
							derivations.push({
								id,
								role: sourceRoleKey,
								on_resource: sourceResourceKey,
								to_role: targetRoleKey,
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

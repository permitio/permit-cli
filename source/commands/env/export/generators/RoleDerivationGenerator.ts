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
	// Track processed derivations to avoid duplicates
	private processedDerivations = new Set<string>();

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

		// For default roles, use the resource__role pattern directly
		if (['admin', 'editor', 'viewer'].includes(roleKey)) {
			return `${resourceKey}__${roleKey}`;
		}

		// If it's not found in the map, add a warning and use a safe fallback
		this.warningCollector.addWarning(
			`Role ID not found for ${roleKey} on resource ${resourceKey}. Using fallback.`,
		);

		// Fallback - create a safe ID based on both resource and role
		return `${resourceKey}__${roleKey}`;
	}

	// Helper method to find the correct relation Terraform resource name
	private findRelationTerraformName(
		sourceResource: string,
		targetResource: string,
		relationKey: string,
	): string | undefined {
		const directKey = `${sourceResource}:${relationKey}:${targetResource}`;
		if (this.relationIdMap.has(directKey)) {
			return this.relationIdMap.get(directKey);
		}

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
		// Make sure the derivation ID is unique for the specific resources and roles
		return `${sourceResourceKey}_${sourceRoleKey}_to_${targetResourceKey}_${targetRoleKey}`;
	}

	// Helper to create dependencies list
	private createDependenciesList(
		sourceTerraformRoleId: string,
		sourceResourceKey: string,
		targetTerraformRoleId: string,
		targetResourceKey: string,
		relationResourceName: string,
	): string[] {
		return [
			`permitio_role.${sourceTerraformRoleId}`,
			`permitio_resource.${sourceResourceKey}`,
			`permitio_role.${targetTerraformRoleId}`,
			`permitio_resource.${targetResourceKey}`,
			`permitio_relation.${relationResourceName}`,
		];
	}

	// Fetch all resources
	private async fetchResources() {
		try {
			const resources = await this.permit.api.resources.list();
			if (!Array.isArray(resources)) {
				return [];
			}
			return resources;
		} catch (error) {
			this.warningCollector.addWarning(`Failed to fetch resources: ${error}`);
			return [];
		}
	}

	// Build a derivation object from role grant data
	private buildDerivation(
		sourceRoleKey: string,
		sourceResourceKey: string,
		relationKey: string,
		targetRoleKey: string,
		targetResourceKey: string,
	): RoleDerivationData | null {
		// Get the Terraform relation resource name
		const relationResourceName = this.findRelationTerraformName(
			sourceResourceKey,
			targetResourceKey,
			relationKey,
		);

		if (!relationResourceName) {
			this.warningCollector.addWarning(
				`Could not determine relation resource name for ${sourceRoleKey} (${sourceResourceKey}) → ${targetRoleKey} (${targetResourceKey}) via ${relationKey}`,
			);
			return null;
		}

		// Get the Terraform role IDs
		const sourceTerraformRoleId = this.getRoleTerraformId(
			sourceRoleKey,
			sourceResourceKey,
		);
		const targetTerraformRoleId = this.getRoleTerraformId(
			targetRoleKey,
			targetResourceKey,
		);

		// Create a derivation ID
		const id = this.createDerivationId(
			sourceResourceKey,
			sourceRoleKey,
			targetResourceKey,
			targetRoleKey,
		);

		// Standard dependencies
		const dependencies = this.createDependenciesList(
			sourceTerraformRoleId,
			sourceResourceKey,
			targetTerraformRoleId,
			targetResourceKey,
			relationResourceName,
		);

		return {
			id,
			role: sourceTerraformRoleId,
			on_resource: sourceResourceKey,
			to_role: targetTerraformRoleId,
			resource: targetResourceKey,
			linked_by: relationResourceName,
			dependencies,
		};
	}

	// Process a single role grant
	private processRoleGrant(
		grant: any,
		targetRoleKey: string,
		targetResourceKey: string,
	): RoleDerivationData | null {
		if (!grant.role || !grant.on_resource || !grant.linked_by_relation) {
			return null;
		}

		const sourceRoleKey = grant.role;
		const sourceResourceKey = grant.on_resource;
		const relationKey = grant.linked_by_relation;

		// Skip duplicates
		const derivationKey = `${sourceRoleKey}:${sourceResourceKey}:${relationKey}:${targetRoleKey}:${targetResourceKey}`;
		if (this.processedDerivations.has(derivationKey)) {
			return null;
		}

		// Mark this derivation as processed
		this.processedDerivations.add(derivationKey);

		return this.buildDerivation(
			sourceRoleKey,
			sourceResourceKey,
			relationKey,
			targetRoleKey,
			targetResourceKey,
		);
	}

	// Process all role grants for a role
	private async processRoleGrants(
		role: any,
		resourceKey: string,
	): Promise<RoleDerivationData[]> {
		const derivations: RoleDerivationData[] = [];

		if (!role.key || !role.granted_to?.users_with_role?.length) {
			return derivations;
		}

		for (const grant of role.granted_to.users_with_role) {
			const derivation = this.processRoleGrant(grant, role.key, resourceKey);
			if (derivation) {
				derivations.push(derivation);
			}
		}

		return derivations;
	}

	// Process a single resource
	private async processResource(resource: any): Promise<RoleDerivationData[]> {
		if (!resource.key) {
			return [];
		}

		try {
			// Get roles for this resource
			const roles = await this.permit.api.resourceRoles.list({
				resourceKey: resource.key,
			});

			if (!Array.isArray(roles) || !roles.length) {
				return [];
			}

			const derivations: RoleDerivationData[] = [];

			for (const role of roles) {
				const roleDerivations = await this.processRoleGrants(
					role,
					resource.key,
				);
				derivations.push(...roleDerivations);
			}

			return derivations;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to process roles for resource '${resource.key}': ${error}`,
			);
			return [];
		}
	}

	async generateHCL(): Promise<string> {
		try {
			// Get all resources
			const resources = await this.fetchResources();
			if (!resources.length) {
				return '';
			}

			// Reset processed derivations
			this.processedDerivations.clear();

			// Process all resources and collect derivations
			const allDerivations: RoleDerivationData[] = [];
			for (const resource of resources) {
				const resourceDerivations = await this.processResource(resource);
				allDerivations.push(...resourceDerivations);
			}

			if (!allDerivations.length) {
				return '';
			}

			return (
				'\n# Role Derivations\n' +
				this.template({ derivations: allDerivations })
			);
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to generate role derivations: ${error}`,
			);
			return '';
		}
	}
}

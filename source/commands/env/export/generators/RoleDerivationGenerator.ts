import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
	ResourceRoleRead,
	RelationRead,
	ResourceRead,
} from 'permitio/build/main/openapi/types';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

interface RoleDerivationData {
	resource_id: string;
	resource: string;
	role: string;
	linked_by: string;
	on_resource: string;
	to_role: string;
	dependencies: string[];
}

interface ResourceData {
	resource: ResourceRead;
	roles: ResourceRoleRead[];
	relations: RelationRead[];
}

interface ResourceRelation {
	sourceResource: string;
	targetResource: string;
	relation: RelationRead;
}

interface PaginatedResponse<T> {
	data: T[];
	[key: string]: any;
}

export class RoleDerivationGenerator implements HCLGenerator {
	name = 'role derivation';
	private template: Handlebars.TemplateDelegate<{
		derivations: RoleDerivationData[];
	}>;

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

	private async gatherResourceData(): Promise<Map<string, ResourceData>> {
		const resourceMap = new Map<string, ResourceData>();
		try {
			const resources = await this.permit.api.resources.list();
			if (!resources?.length) return resourceMap;

			for (const resource of resources) {
				if (!resource.key) continue;
				try {
					// Get roles
					const roles = await this.permit.api.resourceRoles.list({
						resourceKey: resource.key,
					});

					// Get relations and ensure we have an array
					const relationsResponse =
						await this.permit.api.resourceRelations.list({
							resourceKey: resource.key,
						});

					// Handle both array and paginated response cases
					const relations = Array.isArray(relationsResponse)
						? relationsResponse
						: (relationsResponse as PaginatedResponse<RelationRead>)?.data ||
							[];

					resourceMap.set(resource.key, {
						resource,
						roles: roles ?? [],
						relations,
					});
				} catch (error) {
					this.warningCollector.addWarning(
						`Failed to gather data for resource '${resource.key}': ${error}`,
					);
				}
			}
		} catch (error) {
			this.warningCollector.addWarning(`Failed to gather resources: ${error}`);
		}
		return resourceMap;
	}

	private getRoleSuffix(roleKey: string): string | undefined {
		const parts = roleKey.split('_');
		return parts[parts.length - 1];
	}

	private getResourcePrefix(roleKey: string): string | undefined {
		const parts = roleKey.split('_');
		return parts.length > 1 ? parts[0] : undefined;
	}

	private getBaseRoleForResource(
		roles: ResourceRoleRead[],
	): string | undefined {
		return roles.find(role => this.getRoleSuffix(role.key || '') === 'user')
			?.key;
	}

	private simplifyRoleName(roleKey: string): string {
		const prefix = this.getResourcePrefix(roleKey);
		const suffix = this.getRoleSuffix(roleKey);
		return prefix && suffix ? `${prefix}_${suffix}` : roleKey;
	}

	private createSimpleDerivationId(
		sourceRole: string,
		targetRole: string,
	): string {
		const sourceSimple = this.simplifyRoleName(sourceRole);
		const targetSimple = this.simplifyRoleName(targetRole);
		return `${sourceSimple}_to_${targetSimple}`;
	}

	private buildDependencyList(config: {
		role: string;
		resource: string;
		toRole: string;
		toResource: string;
		relationKey: string;
	}): string[] {
		return [
			`permitio_role.${createSafeId(config.role)}`,
			`permitio_resource.${createSafeId(config.resource)}`,
			`permitio_role.${createSafeId(config.toRole)}`,
			`permitio_resource.${createSafeId(config.toResource)}`,
			`permitio_relation.${createSafeId(config.relationKey)}`,
		];
	}

	private getAllResourceRelations(
		resourceMap: Map<string, ResourceData>,
	): ResourceRelation[] {
		const relations: ResourceRelation[] = [];
		const processedRelations = new Set<string>();

		resourceMap.forEach(data => {
			if (Array.isArray(data.relations)) {
				data.relations.forEach(relation => {
					const relationKey = `${relation.subject_resource}_${relation.key}_${relation.object_resource}`;

					if (
						relation.subject_resource &&
						relation.object_resource &&
						!processedRelations.has(relationKey)
					) {
						relations.push({
							sourceResource: relation.subject_resource,
							targetResource: relation.object_resource,
							relation,
						});
						processedRelations.add(relationKey);
					}
				});
			}
		});

		return relations;
	}

	private async processDerivations(
		resourceMap: Map<string, ResourceData>,
	): Promise<RoleDerivationData[]> {
		const derivations: RoleDerivationData[] = [];
		const relations = this.getAllResourceRelations(resourceMap);
		const processedDerivations = new Set<string>();

		for (const relation of relations) {
			const sourceData = resourceMap.get(relation.sourceResource);
			const targetData = resourceMap.get(relation.targetResource);

			if (!sourceData || !targetData) continue;

			const sourceRole = this.getBaseRoleForResource(sourceData.roles);
			const targetRole = this.getBaseRoleForResource(targetData.roles);

			if (sourceRole && targetRole && relation.relation.key) {
				const derivationId = this.createSimpleDerivationId(
					sourceRole,
					targetRole,
				);

				if (!processedDerivations.has(derivationId)) {
					derivations.push({
						resource_id: derivationId,
						resource: relation.targetResource,
						role: sourceRole,
						linked_by: relation.relation.key,
						on_resource: relation.sourceResource,
						to_role: targetRole,
						dependencies: this.buildDependencyList({
							role: sourceRole,
							resource: relation.sourceResource,
							toRole: targetRole,
							toResource: relation.targetResource,
							relationKey: relation.relation.key,
						}),
					});
					processedDerivations.add(derivationId);
				}
			}
		}

		return derivations;
	}

	async generateHCL(): Promise<string> {
		try {
			const resourceMap = await this.gatherResourceData();
			if (resourceMap.size === 0) return '';

			const derivations = await this.processDerivations(resourceMap);
			if (derivations.length === 0) return '';

			const hcl = this.template({ derivations });
			return '\n# Role Derivations\n' + hcl;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to generate role derivations: ${error}`,
			);
			return '';
		}
	}
}

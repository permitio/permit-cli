import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId, fetchList } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RelationRead, ResourceRead } from 'permitio/build/main/openapi/types';
import he from 'he';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

// Helper function to unescape HTML entities using the he library
function unescapeHtml(text: string | undefined): string {
	if (!text) return '';
	return he.decode(text);
}

interface RelationData {
	relation_id: string;
	name: string;
	key: string;
	description?: string;
	subject_resource: string;
	object_resource: string;
	subject_resource_ref: string;
	object_resource_ref: string;
	dependencies: string[];
}

export class RelationGenerator implements HCLGenerator {
	name = 'relation';
	private template: Handlebars.TemplateDelegate<{ relations: RelationData[] }>;
	private relationIdMap = new Map<string, string>();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		const templatePath = join(currentDirPath, '../templates/relation.hcl');
		const templateContent = readFileSync(templatePath, 'utf-8');
		this.template = Handlebars.compile(templateContent);
	}

	public getRelationIdMap(): Map<string, string> {
		return this.relationIdMap;
	}

	// Generate a relation ID based on the relationship semantics
	private generateRelationId(
		subjectResource: string,
		relation: RelationRead,
		objectResource: string,
	): string {
		const objectFirstRelations = ['owner', 'part'];

		if (relation.key && objectFirstRelations.includes(relation.key)) {
			return `${objectResource}_${subjectResource}`;
		}

		return `${subjectResource}_${objectResource}`;
	}

	private async getAllResourceRelations(): Promise<RelationData[]> {
		const relations: RelationData[] = [];
		const processedRelations = new Set<string>();
		const resourcesMap = new Map<string, ResourceRead>();

		// Clear existing data
		this.relationIdMap.clear();

		try {
			const resources = await fetchList(
				params => this.permit.api.resources.list(params),
				{},
			);

			// Build resource map for faster lookups
			resources.forEach(resource => {
				if (resource.key) {
					resourcesMap.set(resource.key, resource);
				}
			});

			for (const resource of resources) {
				if (!resource.key) continue;

				try {
					const resourceRelations = await fetchList(
						params =>
							this.permit.api.resourceRelations.list({
								...params,
								resourceKey: resource.key,
							}),
						{},
					);

					for (const relation of resourceRelations) {
						if (
							!relation.key ||
							!relation.subject_resource ||
							!relation.object_resource
						)
							continue;

						// Use a unique identifier for tracking processed relations
						const relationKey = `${relation.subject_resource}_${relation.key}_${relation.object_resource}`;

						if (!processedRelations.has(relationKey)) {
							const safeSubjectResource = createSafeId(
								relation.subject_resource,
							);
							const safeObjectResource = createSafeId(relation.object_resource);

							// Generate a relation ID based on subject and object resources
							const relationId = this.generateRelationId(
								safeSubjectResource,
								relation,
								safeObjectResource,
							);

							// Store the relation with its Terraform resource name
							relations.push({
								relation_id: relationId,
								name: unescapeHtml(relation.name) || relation.key,
								key: relation.key,
								description: unescapeHtml(relation.description),
								subject_resource: safeSubjectResource,
								object_resource: safeObjectResource,
								// Reference to the resource's key property for Terraform
								subject_resource_ref: `permitio_resource.${safeSubjectResource}.key`,
								object_resource_ref: `permitio_resource.${safeObjectResource}.key`,
								dependencies: [
									`permitio_resource.${safeObjectResource}`,
									`permitio_resource.${safeSubjectResource}`,
								],
							});

							// IMPORTANT: Store the relation ID mapping for use by RoleDerivationGenerator
							const relationLookupKey = `${relation.subject_resource}:${relation.key}:${relation.object_resource}`;
							this.relationIdMap.set(relationLookupKey, relationId);

							processedRelations.add(relationKey);
						}
					}
				} catch (error) {
					this.warningCollector.addWarning(
						`Failed to get relations for resource '${resource.key}': ${error}`,
					);
				}
			}
		} catch (error) {
			this.warningCollector.addWarning(`Failed to fetch resources: ${error}`);
		}

		return relations;
	}

	async generateHCL(): Promise<string> {
		try {
			const relations = await this.getAllResourceRelations();

			if (relations.length === 0) return '';

			const hcl = this.template({ relations });
			return '\n# Relations\n' + hcl;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to generate relations: ${error}`,
			);
			return '';
		}
	}
}

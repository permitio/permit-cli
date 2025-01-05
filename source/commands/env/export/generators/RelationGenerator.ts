import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RelationData {
	key: string;
	name: string;
	subject_resource: string;
	object_resource: string;
	description?: string;
	[key: string]: unknown;
}

interface RawRelation {
	key: string;
	name: string;
	subject_resource: string;
	object_resource: string;
	description?: string;
	[key: string]: unknown;
}

export class RelationGenerator implements HCLGenerator {
	name = 'relations';
	private template: TemplateDelegate;
	private resourceKeys: Set<string> = new Set();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/relation.hcl'), 'utf-8'),
		);
	}

	private async loadResourceKeys(): Promise<void> {
		try {
			const resources = await this.permit.api.resources.list();
			if (resources && Array.isArray(resources)) {
				resources.forEach(resource => {
					if (resource.key !== '__user') {
						this.resourceKeys.add(createSafeId(resource.key));
					}
				});
			}
		} catch (error) {
			this.warningCollector.addWarning(`Failed to load resources: ${error}`);
		}
	}

	private validateResource(resourceKey: string): boolean {
		const safeKey = createSafeId(resourceKey);
		if (!this.resourceKeys.has(safeKey)) {
			this.warningCollector.addWarning(
				`Referenced resource "${resourceKey}" does not exist`,
			);
			return false;
		}
		return true;
	}

	private validateRelation(relation: RawRelation): relation is RelationData {
		const requiredFields = [
			'key',
			'name',
			'subject_resource',
			'object_resource',
		];
		const missingFields = requiredFields.filter(field => !relation[field]);

		if (missingFields.length > 0) {
			this.warningCollector.addWarning(
				`Relation "${relation.key || 'unknown'}" is missing required fields: ${missingFields.join(', ')}`,
			);
			return false;
		}

		// Validate that referenced resources exist
		if (
			!this.validateResource(relation.subject_resource) ||
			!this.validateResource(relation.object_resource)
		) {
			return false;
		}

		return true;
	}

	private formatRelation(relation: RelationData): RelationData {
		return {
			key: createSafeId(relation.key),
			name: relation.name,
			subject_resource: createSafeId(relation.subject_resource),
			object_resource: createSafeId(relation.object_resource),
			...(relation.description && { description: relation.description }),
		};
	}

	async generateHCL(): Promise<string> {
		try {
			// Load resources first for validation
			await this.loadResourceKeys();

			// Get all resources
			const resources = await this.permit.api.resources.list();

			if (!resources?.length) {
				return '';
			}

			// Collect all relations
			const allRelations: RawRelation[] = [];
			for (const resource of resources) {
				if (resource.key === '__user') {
					continue;
				}

				try {
					const resourceRelations =
						await this.permit.api.resourceRelations.list({
							resourceKey: resource.key,
						});

					if (resourceRelations?.length) {
						allRelations.push(
							...(resourceRelations as unknown as RawRelation[]),
						);
					}
				} catch (err) {
					this.warningCollector.addWarning(
						`Failed to fetch relations for resource ${resource.key}: ${err}`,
					);
				}
			}

			if (!allRelations.length) {
				return '';
			}

			// Remove duplicates and get unique relations
			const uniqueRelations = Array.from(
				new Map(allRelations.map(r => [r.key, r])).values(),
			);

			// Validate and format relations
			const validRelations = uniqueRelations
				.filter(this.validateRelation.bind(this))
				.map(this.formatRelation.bind(this));

			if (!validRelations.length) {
				return '';
			}

			// Generate HCL
			return (
				'\n# Resource Relations\n' +
				this.template({ relations: validRelations })
			);
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export relations: ${error}`);
			return '';
		}
	}
}

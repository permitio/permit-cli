import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class RelationGenerator implements HCLGenerator {
	name = 'relations';
	private template: HandlebarsTemplateDelegate;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/relation.hcl'), 'utf-8'),
		);
	}

	async generateHCL(): Promise<string> {
		try {
			// First get all resources
			const resources = await this.permit.api.resources.list();
			if (!resources || !Array.isArray(resources)) {
				return ''; // Return empty string when no resources, no header
			}

			// For each resource, get its relations
			let allRelations = [];
			for (const resource of resources) {
				if (resource.key === '__user') continue; // Skip internal user resource

				try {
					const resourceRelations =
						await this.permit.api.resourceRelations.list({
							resourceKey: resource.key,
						});

					if (resourceRelations && Array.isArray(resourceRelations)) {
						allRelations.push(...resourceRelations);
					}
				} catch (err) {
					this.warningCollector.addWarning(
						`Failed to fetch relations for resource ${resource.key}: ${err}`,
					);
				}
			}

			if (allRelations.length === 0) {
				return ''; // Return empty string if no relations found, no header
			}

			// Remove duplicates based on relation key
			const uniqueRelations = Array.from(
				new Map(allRelations.map(r => [r.key, r])).values(),
			);

			// Map the relations to the format expected by the template
			const formattedRelations = uniqueRelations.map(relation => ({
				key: createSafeId(relation.key),
				name: relation.name || relation.key,
				description: relation.description,
				subject_resource: relation.subject_resource,
				object_resource: relation.object_resource,
			}));

			return '\n# Resource Relations\n' + this.template({ relations: formattedRelations });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export relations: ${error}`);
			return '';
		}
	}
}
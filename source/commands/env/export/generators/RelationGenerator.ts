import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';

export class RelationGenerator implements HCLGenerator {
	name = 'relations';

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {}

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

			// Add header only when we have relations to show
			let hcl = '\n# Resource Relations\n';

			// Remove duplicates based on relation key
			const uniqueRelations = Array.from(
				new Map(allRelations.map(r => [r.key, r])).values(),
			);

			for (const relation of uniqueRelations) {
				try {
					if (
						!relation.key ||
						!relation.subject_resource ||
						!relation.object_resource
					) {
						this.warningCollector.addWarning(
							`Skipping invalid relation with key: ${relation.key}`,
						);
						continue;
					}

					hcl += `resource "permitio_relation" "${createSafeId(relation.key)}" {
	key = "${relation.key}"
	name = "${relation.name || relation.key}"${
		relation.description ? `\n  description = "${relation.description}"` : ''
	}
	subject_resource = "${relation.subject_resource}"
	object_resource = "${relation.object_resource}"
  }\n`;
				} catch (relationError) {
					this.warningCollector.addWarning(
						`Failed to export relation ${relation.key}: ${relationError}`,
					);
					continue;
				}
			}

			return hcl;
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export relations: ${error}`);
			return '';
		}
	}
}

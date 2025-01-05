import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define a proper type for the resource object
interface ResourceData {
	key: string;
	name: string;
	description?: string;
	urn?: string;
	actions: Record<string, any>;
	attributes?: Record<string, any>;
}

export class ResourceGenerator implements HCLGenerator {
	name = 'resources';
	private template: TemplateDelegate<{ resources: ResourceData[] }>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/resource.hcl'), 'utf-8'),
		);
	}

	async generateHCL(): Promise<string> {
		try {
			const resources = await this.permit.api.resources.list();
			const validResources = resources
				.filter(resource => resource.key !== '__user')
				.map(resource => ({
					key: createSafeId(resource.key),
					name: resource.name,
					description: resource.description,
					urn: resource.urn,
					actions: resource.actions || {},
					attributes: resource.attributes,
				}));

			if (validResources.length === 0) return '';

			return '\n# Resources\n' + this.template({ resources: validResources });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export resources: ${error}`);
			return '';
		}
	}
}

import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ResourceSetData {
	key: string;
	name: string;
	conditions: string;
	resource: string;
	depends_on: string[];
}

interface ResourceAttribute {
	resourceKey: string;
	attributeKey: string;
}

interface ConditionsObject {
	[key: string]: unknown;
}

export class ResourceSetGenerator implements HCLGenerator {
	name = 'resource sets';
	private template: TemplateDelegate<{ sets: ResourceSetData[] }>;
	private resourceKeyMap: Map<string, string> = new Map();
	private resourceAttributes: ResourceAttribute[] = [];

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		// Load and compile the template
		const templatePath = join(__dirname, '../templates/resource-set.hcl');
		try {
			const templateContent = readFileSync(templatePath, 'utf-8');
			this.template = Handlebars.compile(templateContent);
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to load resource set template: ${error}`,
			);
			// Provide a fallback template in case file loading fails
			this.template = Handlebars.compile(`
# Resource Sets
{{#each sets}}
resource "permitio_resource_set" "{{key}}" {
  name        = "{{name}}"
  key         = "{{key}}"
  resource    = permitio_resource.{{resource}}.key
  conditions  = {{{conditions}}}
  depends_on  = [
    {{#each depends_on}}
    {{this}}{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
{{/each}}
      `);
		}
	}

	private async fetchResourceAttributes(): Promise<void> {
		try {
			const resources = await this.permit.api.resources.list();
			resources.forEach(resource => {
				// Skip the built-in user resource
				if (resource.key === '__user') return;
				// Store resource ID to key mapping
				this.resourceKeyMap.set(resource.id.toString(), resource.key);
				// Store resource attributes
				if (resource.attributes) {
					for (const [attrKey] of Object.entries(resource.attributes)) {
						this.resourceAttributes.push({
							resourceKey: resource.key,
							attributeKey: attrKey,
						});
					}
				}
			});
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to fetch resource attributes: ${error}`,
			);
		}
	}

	private detectAdditionalDependencies(): string[] {
		return [];
	}

	async generateHCL(): Promise<string> {
		try {
			// First fetch resource data to build maps
			await this.fetchResourceAttributes();
			const resourceSets = await this.permit.api.conditionSets.list({});

			const validSets = resourceSets
				.filter(set => set.type === 'resourceset' && set.resource_id)
				.map(set => {
					const resourceKey =
						this.resourceKeyMap.get(set.resource_id!.toString()) ||
						set.resource_id!.toString();

					const conditions =
						(set.conditions as string | ConditionsObject) ??
						({} as ConditionsObject);

					// Start with resource dependency
					const dependencies = [`permitio_resource.${resourceKey}`];
					const additionalDeps = this.detectAdditionalDependencies();
					dependencies.push(...additionalDeps);

					return {
						key: createSafeId(set.key),
						name: set.name,
						// description field removed from returned object
						conditions: this.formatConditions(conditions),
						resource: resourceKey,
						depends_on: dependencies,
					};
				});

			if (validSets.length === 0) {
				return '';
			}

			const templateContext = { sets: validSets };
			const generated = this.template(templateContext);

			return '\n# Resource Sets\n' + generated;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export resource sets: ${error}`,
			);
			return '';
		}
	}

	private formatConditions(conditions: string | ConditionsObject): string {
		try {
			if (typeof conditions === 'string') {
				try {
					const parsed = JSON.parse(conditions) as ConditionsObject;
					return `jsonencode(${JSON.stringify(parsed, null, 2)})`;
				} catch {
					return conditions;
				}
			}
			return `jsonencode(${JSON.stringify(conditions, null, 2)})`;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to format conditions: ${error}. Using stringified version.`,
			);
			return JSON.stringify(conditions);
		}
	}
}

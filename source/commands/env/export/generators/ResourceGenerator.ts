import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ActionData {
	name: string;
	description?: string;
}

interface AttributeData {
	type: string;
	required?: boolean;
}

interface ResourceData {
	key: string;
	name: string;
	description?: string;
	urn?: string;
	actions: Record<string, ActionData>;
	attributes?: Record<string, AttributeData>;
}

interface ActionBlockRead {
	name?: string;
	description?: string;
}

interface AttributeBlockRead {
	type?: string;
	required?: boolean;
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
					actions: this.transformActions(resource.actions || {}), // Transform actions
					attributes: this.transformAttributes(resource.attributes), // Transform attributes
				}));

			if (validResources.length === 0) return '';

			return '\n# Resources\n' + this.template({ resources: validResources });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export resources: ${error}`);
			return '';
		}
	}

	// Helper function to transform actions
	private transformActions(
		actions: Record<string, ActionBlockRead>,
	): Record<string, ActionData> {
		const transformedActions: Record<string, ActionData> = {};
		for (const [key, action] of Object.entries(actions)) {
			transformedActions[key] = {
				name: action.name || key, // Use the key as a fallback if `name` is undefined
				description: action.description,
			};
		}
		return transformedActions;
	}

	// Helper function to transform attributes
	private transformAttributes(
		attributes: Record<string, AttributeBlockRead> | undefined,
	): Record<string, AttributeData> | undefined {
		if (!attributes) return undefined;

		const transformedAttributes: Record<string, AttributeData> = {};
		for (const [key, attribute] of Object.entries(attributes)) {
			transformedAttributes[key] = {
				type: attribute.type || 'string',
				required: attribute.required || false,
			};
		}
		return transformedAttributes;
	}
}

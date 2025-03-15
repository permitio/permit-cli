import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId, fetchList } from '../utils.js';
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
	name: string;
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
	depends_on?: string[];
}

interface ActionBlockRead {
	name?: string;
	description?: string;
}

interface AttributeBlockRead {
	type: string;
	description?: string;
	name?: string;
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
			// Use the fetchList utility to get all resources with pagination
			const resources = await fetchList(
				params => this.permit.api.resources.list(params),
				{},
			);

			const validResources = resources
				.filter(resource => resource.key !== '__user')
				.map(resource => ({
					key: createSafeId(resource.key),
					name: resource.name,
					description: resource.description,
					urn: resource.urn,
					actions: this.transformActions(resource.actions || {}),
					attributes: this.transformAttributes(resource.attributes || {}),
					depends_on: [],
				}));

			if (validResources.length === 0) return '';

			return '\n# Resources\n' + this.template({ resources: validResources });
		} catch (error) {
			console.error('Error generating HCL:', error);
			this.warningCollector.addWarning(`Failed to export resources: ${error}`);
			return '';
		}
	}

	private transformActions(
		actions: Record<string, ActionBlockRead>,
	): Record<string, ActionData> {
		const transformedActions: Record<string, ActionData> = {};
		for (const [key, action] of Object.entries(actions)) {
			transformedActions[key] = {
				name: action.name || this.capitalizeFirstLetter(key),
				...(action.description && { description: action.description }),
			};
		}
		return transformedActions;
	}

	private transformAttributes(
		attributes: Record<string, AttributeBlockRead>,
	): Record<string, AttributeData> {
		const transformedAttributes: Record<string, AttributeData> = {};
		for (const [key, attribute] of Object.entries(attributes)) {
			transformedAttributes[key] = {
				name: attribute.name || this.generateAttributeName(key),
				type: this.normalizeAttributeType(attribute.type),
				...(attribute.required && { required: attribute.required }),
			};
		}
		return transformedAttributes;
	}

	private normalizeAttributeType(type: string): string {
		const typeMap: Record<string, string> = {
			boolean: 'bool',
			array: 'array',
			string: 'string',
			number: 'number',
			json: 'json',
		};
		return typeMap[type.toLowerCase()] || type;
	}

	private capitalizeFirstLetter(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private generateAttributeName(key: string): string {
		return key
			.split(/[_\s]|(?=[A-Z])/)
			.map(word => this.capitalizeFirstLetter(word))
			.join(' ');
	}
}

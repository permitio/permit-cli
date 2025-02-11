import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface UserAttributeData {
	resourceKey: string;
	key: string;
	type: string;
	description?: string;
}

export class UserAttributesGenerator implements HCLGenerator {
	name = 'user attribute';
	private template: TemplateDelegate<{ attributes: UserAttributeData[] }>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		Handlebars.registerHelper('formatDescription', function (text) {
			if (!text) return '';

			const decoded = text.replace(/&[^;]+;/g, match => {
				const entities: Record<string, string> = {
					'&quot;': '"',
					'&#x27;': "'",
					'&amp;': '&',
					'&lt;': '<',
					'&gt;': '>',
				};
				return entities[match] || match;
			});

			// Escape special characters for HCL
			return decoded.replace(/[\\"]/g, '\\$&');
		});

		// Load and compile template
		this.template = this.loadTemplate();
	}

	private loadTemplate(): TemplateDelegate<{
		attributes: UserAttributeData[];
	}> {
		try {
			const templatePath = join(__dirname, '../templates/user-attribute.hcl');
			const templateContent = readFileSync(templatePath, 'utf-8');
			return Handlebars.compile(templateContent, { noEscape: true });
		} catch (error) {
			throw new Error(`Failed to load user attribute template: ${error}`);
		}
	}

	private async getUserAttributes(): Promise<UserAttributeData[]> {
		const userResource = await this.permit.api.resources.get('__user');
		if (!userResource?.attributes) {
			return [];
		}

		// Filter and transform attributes
		return Object.entries(userResource.attributes)
			.filter(([_, attr]) => {
				const description = attr.description?.toLowerCase() || '';
				return !description.includes('built in attribute');
			})
			.map(([key, attr]) => ({
				resourceKey: this.generateResourceKey(key),
				key,
				type: this.normalizeAttributeType(attr.type),
				description: attr.description,
			}));
	}

	private generateResourceKey(key: string): string {
		return `user_${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
	}

	private normalizeAttributeType(type: string): string {
		// Map attribute types to supported HCL types
		const typeMap: Record<string, string> = {
			string: 'string',
			number: 'number',
			boolean: 'bool',
			array: 'array',
			object: 'json',
		};
		return typeMap[type.toLowerCase()] || 'string';
	}

	async generateHCL(): Promise<string> {
		try {
			const attributes = await this.getUserAttributes();

			if (attributes.length === 0) {
				return '';
			}

			const header = '\n# User Attributes\n';
			const content = this.template({ attributes });

			return header + content;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.warningCollector.addWarning(
				`Failed to export user attributes: ${errorMessage}`,
			);
			return '';
		}
	}
}

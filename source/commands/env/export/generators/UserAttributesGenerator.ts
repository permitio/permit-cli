import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define a proper type for the user attribute object
interface UserAttributeData {
	key: string;
	type: string;
	description?: string;
}

export class UserAttributesGenerator implements HCLGenerator {
	name = 'user attributes';
	private template: TemplateDelegate<{ attributes: UserAttributeData[] }>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/user-attribute.hcl'), 'utf-8'),
		);
	}

	async generateHCL(): Promise<string> {
		try {
			const userAttributes = await this.permit.api.resourceAttributes.list({
				resourceKey: '__user',
			});

			if (!userAttributes || userAttributes.length === 0) return '';

			const validAttributes = userAttributes.map(attr => ({
				key: createSafeId(attr.key),
				type: attr.type,
				description: attr.description,
			}));

			return (
				'\n# User Attributes\n' + this.template({ attributes: validAttributes })
			);
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export user attributes: ${error}`,
			);
			return '';
		}
	}
}

import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface UserSetData {
	key: string;
	name: string;
	description?: string;
	conditions: object;
	resource?: string;
	depends_on: string[];
}

interface UserAttribute {
	key: string;
	id: string;
}

export class UserSetGenerator implements HCLGenerator {
	name = 'user set';
	private template: TemplateDelegate<{ sets: UserSetData[] }>;
	private userAttributes: UserAttribute[] = [];
	private availableUserAttributes: Set<string> = new Set();

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		Handlebars.registerHelper('formatConditions', function (conditions) {
			return JSON.stringify(conditions, null, 2)
				.replace(/"([^"\s]+)":/g, '"$1" =')
				.replace(/"contains" =/g, 'contains =')
				.replace(/"([^"\s]+)"/g, '"$1"');
		});

		const templateContent = readFileSync(
			join(__dirname, '../templates/user-set.hcl'),
			'utf-8',
		);
		const cleanTemplate = templateContent.replace(/^#.*\n?/gm, '');
		this.template = Handlebars.compile(cleanTemplate);
	}

	private async fetchUserAttributes(): Promise<void> {
		try {
			const userResource = await this.permit.api.resources.get('__user');
			if (!userResource?.attributes) return;

			// Store available attribute keys for validation
			this.availableUserAttributes = new Set(
				Object.keys(userResource.attributes),
			);

			this.userAttributes = Object.entries(userResource.attributes)
				.filter(([, attr]) => {
					const description = attr.description?.toLowerCase() || '';
					return !description.includes('built in attribute');
				})
				.map(([key]) => ({
					key,
					id: `user_${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
				}));
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to fetch user attributes: ${error}`,
			);
		}
	}

	// Detect user attributes referenced in conditions
	private detectDependencies(conditions: object): string[] {
		const stringifiedConditions = JSON.stringify(conditions);
		const deps = new Set<string>();

		// Check for attributes in user.<attribute> pattern
		for (const attr of this.userAttributes) {
			// Match both "user.<key>" and "subject.<key>" patterns
			const userPattern = `"user.${attr.key}"`;
			const subjectPattern = `"subject.${attr.key}"`;

			if (
				stringifiedConditions.includes(userPattern) ||
				stringifiedConditions.includes(subjectPattern)
			) {
				deps.add(`permitio_user_attribute.${attr.id}`);
			}
		}

		return Array.from(deps);
	}

	// Process conditions for Terraform
	private processConditions(conditions: any): any {
		if (!conditions) return conditions;

		if (typeof conditions !== 'object') return conditions;

		// Handle arrays (like allOf, anyOf arrays)
		if (Array.isArray(conditions)) {
			return conditions
				.map(item => this.processConditions(item))
				.filter(item => item !== null);
		}

		// Process object properties
		const result: any = {};

		for (const [key, value] of Object.entries(conditions)) {
			// Add proper dependencies but don't modify the condition
			const cleanValue = this.processConditions(value);
			if (cleanValue !== null) {
				result[key] = cleanValue;
			}
		}

		return Object.keys(result).length > 0 ? result : null;
	}

	async generateHCL(): Promise<string> {
		try {
			// First fetch user attributes to build dependency list
			await this.fetchUserAttributes();

			const conditionSets = await this.permit.api.conditionSets.list({});

			const validSets = conditionSets
				.filter(set => set.type === 'userset')
				.map(set => {
					const conditions =
						typeof set.conditions === 'string'
							? JSON.parse(set.conditions)
							: set.conditions;

					// Process conditions for Terraform
					const processedConditions = this.processConditions(conditions);

					// If all conditions were invalid, add a warning and skip this set
					if (!processedConditions) {
						this.warningCollector.addWarning(
							`User set "${set.key}" has no valid conditions and will be skipped.`,
						);
						return null;
					}

					// Detect user attribute dependencies
					const dependencies = this.detectDependencies(conditions);

					return {
						key: createSafeId(set.key),
						name: set.name,
						description: set.description,
						conditions: processedConditions,
						resource: set.resource_id?.toString(),
						depends_on: dependencies,
					};
				})
				.filter(Boolean); // Remove null entries

			if (validSets.length === 0) {
				return '';
			}

			return '\n# User Sets\n' + this.template({ sets: validSets });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export user sets: ${error}`);
			return '';
		}
	}
}

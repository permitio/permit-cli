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
	conditions: object;
	resource?: string;
	depends_on: string[];
}

interface UserAttribute {
	key: string;
	resourceKey: string;
	type: string;
	description: string;
}

export class UserSetGenerator implements HCLGenerator {
	name = 'user set';
	private template: TemplateDelegate<{ sets: UserSetData[] }>;
	private sharedUserAttributes: UserAttribute[] = [];

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		Handlebars.registerHelper('formatConditions', function (conditions) {
			// Robust HCL formatter that handles complex nested structures
			const formatHCL = (obj: unknown, indent = 0): string => {
				if (obj === null || obj === undefined) return 'null';

				// Primitive types
				if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;
				if (typeof obj === 'number') return obj.toString();
				if (typeof obj === 'boolean') return obj.toString();

				// Handle arrays
				if (Array.isArray(obj)) {
					if (obj.length === 0) return '[]';

					const indentStr = '  '.repeat(indent);
					const innerIndentStr = '  '.repeat(indent + 1);

					// For arrays, format each element
					return `[\n${obj
						.map(item => `${innerIndentStr}${formatHCL(item, indent + 1)}`)
						.join(',\n')}\n${indentStr}]`;
				}

				// Handle objects (maps in HCL)
				if (typeof obj === 'object') {
					const indentStr = '  '.repeat(indent);
					const innerIndentStr = '  '.repeat(indent + 1);

					// Special handling for complex operators that may cause issues
					const keys = Object.keys(obj);
					if (keys.length === 1) {
						// Get the first and only key
						const key = keys[0];

						if (key !== undefined) {
							const objAsRecord = obj as Record<string, unknown>;
							const value = objAsRecord[key];

							// Special handling for array operators like array_intersect
							if (
								key === 'array_intersect' ||
								key === 'array_contains' ||
								key === 'string_contains'
							) {
								// If the value is a string with commas, assume it's a list of values
								if (typeof value === 'string' && value.includes(',')) {
									// Use heredoc syntax for long lists
									return `{\n${innerIndentStr}${key} = <<EOT\n${value}\nEOT\n${indentStr}}`;
								}
							}
						}
					}

					// Regular object formatting
					const pairs = Object.entries(obj).map(([key, value]) => {
						// Properly format keys with spaces or special characters
						const formattedKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : `"${key}"`;
						return `${innerIndentStr}${formattedKey} = ${formatHCL(value, indent + 1)}`;
					});

					if (pairs.length === 0) return '{}';
					return `{\n${pairs.join('\n')}\n${indentStr}}`;
				}

				// Fallback
				return JSON.stringify(obj);
			};

			return formatHCL(conditions);
		});

		let templateContent = readFileSync(
			join(__dirname, '../templates/user-set.hcl'),
			'utf-8',
		);
		templateContent = templateContent.replace(/^\s*description\s*=.*\n?/gm, '');
		const cleanTemplate = templateContent.replace(/^#.*\n?/gm, '');
		this.template = Handlebars.compile(cleanTemplate);
	}

	// Method to receive shared user attributes from UserAttributesGenerator
	public setUserAttributes(attributes: UserAttribute[]): void {
		this.sharedUserAttributes = attributes;
		console.log(
			`Received ${attributes.length} user attributes from UserAttributesGenerator`,
		);
	}

	private async fetchUserAttributes(): Promise<void> {
		// If we already have user attributes from the UserAttributesGenerator, use them
		if (this.sharedUserAttributes.length > 0) {
			console.log('Using shared user attributes');
			return;
		}

		try {
			console.log('Fetching user attributes directly');
			const userResource = await this.permit.api.resources.get('__user');
			if (!userResource?.attributes) return;

			// Use the same naming convention that UserAttributesGenerator uses
			this.sharedUserAttributes = Object.entries(userResource.attributes)
				.filter(
					([key]) =>
						!['key', 'roles', 'email', 'first_name', 'last_name'].includes(key),
				)
				.filter(([, attr]) => {
					const description = attr.description?.toLowerCase() || '';
					return !description.includes('built in attribute');
				})
				.map(([key, attr]) => ({
					key,
					resourceKey: `user_${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
					type: attr.type,
					description: attr.description || '',
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

		// Check for attributes in user.<attribute> and subject.<attribute> patterns
		for (const attr of this.sharedUserAttributes) {
			// Match both "user.<key>" and "subject.<key>" patterns
			const userPattern = `"user.${attr.key}"`;
			const subjectPattern = `"subject.${attr.key}"`;

			if (
				stringifiedConditions.includes(userPattern) ||
				stringifiedConditions.includes(subjectPattern)
			) {
				deps.add(`permitio_user_attribute.${attr.resourceKey}`);
			}
		}

		return Array.from(deps);
	}

	// Process conditions for Terraform
	private processConditions(conditions: unknown): unknown {
		if (!conditions) return conditions;

		if (typeof conditions !== 'object') return conditions;

		// Handle arrays (like allOf, anyOf arrays)
		if (Array.isArray(conditions)) {
			return conditions
				.map(item => this.processConditions(item))
				.filter(item => item !== null);
		}

		// Process object properties
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(
			conditions as Record<string, unknown>,
		)) {
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
			// Get user attributes first (either shared or fetched)
			await this.fetchUserAttributes();

			const conditionSets = await this.permit.api.conditionSets.list({});

			const userSets: UserSetData[] = [];

			for (const set of conditionSets.filter(set => set.type === 'userset')) {
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
					continue;
				}

				// Detect user attribute dependencies
				const dependencies = this.detectDependencies(conditions);

				userSets.push({
					key: createSafeId(set.key),
					name: set.name,
					conditions: processedConditions as object,
					resource: set.resource_id?.toString(),
					depends_on: dependencies,
				});
			}

			if (userSets.length === 0) {
				return '';
			}

			return '\n# User Sets\n' + this.template({ sets: userSets });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export user sets: ${error}`);
			return '';
		}
	}
}

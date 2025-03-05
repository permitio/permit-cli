import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConditionSetRuleData {
	key: string;
	userSet: string;
	resourceSet: string;
	permission: string;
}

export class ConditionSetGenerator implements HCLGenerator {
	name = 'condition set rules';
	private template: Handlebars.TemplateDelegate<{
		rules: ConditionSetRuleData[];
	}>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/condition-set.hcl'), 'utf-8'),
		);
	}

	async generateHCL(): Promise<string> {
		try {
			// Get all condition set rules
			const conditionSetRules = await this.permit.api.conditionSetRules.list(
				{},
			);

			if (!conditionSetRules || conditionSetRules.length === 0) {
				return '';
			}

			// Process each rule to create the HCL data
			const validRules = conditionSetRules
				.map(rule => {
					try {
						// Extract user set and resource set keys
						const userSetKey = rule.user_set;
						const resourceSetKey = rule.resource_set;
						const permissionKey = rule.permission;

						// Create a unique identifier for this rule
						const ruleKey = `${createSafeId(userSetKey)}_${createSafeId(resourceSetKey)}_${createSafeId(permissionKey)}`;

						return {
							key: ruleKey,
							userSet: createSafeId(userSetKey),
							resourceSet: createSafeId(resourceSetKey),
							permission: permissionKey,
						};
					} catch (error) {
						this.warningCollector.addWarning(
							`Failed to process condition set rule: ${error}`,
						);
						return null;
					}
				})
				.filter((rule): rule is ConditionSetRuleData => rule !== null);

			if (validRules.length === 0) {
				return '';
			}

			// Return generated HCL
			return '\n# Condition Set Rules\n' + this.template({ rules: validRules });
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export condition set rules: ${error}`,
			);
			return '';
		}
	}
}

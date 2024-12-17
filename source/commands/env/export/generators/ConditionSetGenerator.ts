import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';

export class ConditionSetGenerator implements HCLGenerator {
	name = 'condition sets';

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {}

	async generateHCL(): Promise<string> {
		try {
			const conditionSets = await this.permit.api.conditionSets.list();
			if (
				!conditionSets ||
				!Array.isArray(conditionSets) ||
				conditionSets.length === 0
			) {
				return '';
			}

			let hcl = '\n# Condition Sets\n';

			for (const set of conditionSets) {
				try {
					const isResourceSet = set.type === 'resourceset';
					const resourceType = isResourceSet ? 'resource_set' : 'user_set';

					// Handle conditions - ensure they are properly stringified
					const conditions =
						typeof set.conditions === 'string'
							? set.conditions
							: JSON.stringify(set.conditions || '');

					hcl += `resource "permitio_${resourceType}" "${createSafeId(set.key)}" {
  key = "${set.key}"
  name = "${set.name}"${
		set.description ? `\n  description = "${set.description}"` : ''
	}
  conditions = ${conditions}${
		set.resource ? `\n  resource = "${set.resource}"` : ''
	}
}\n`;
				} catch (setError) {
					this.warningCollector.addWarning(
						`Failed to export condition set ${set.key}: ${setError}`,
					);
					continue;
				}
			}

			return hcl;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export condition sets: ${error}`,
			);
			return '';
		}
	}
}

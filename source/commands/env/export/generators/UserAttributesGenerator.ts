import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';

export class UserAttributesGenerator implements HCLGenerator {
	name = 'user attributes';

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {}

	async generateHCL(): Promise<string> {
		try {
			const userAttributes = await this.permit.api.resourceAttributes.list({
				resourceKey: '__user',
			});

			if (!userAttributes || userAttributes.length === 0) return '';

			let hcl = '\n# User Attributes\n';
			for (const attr of userAttributes) {
				hcl += `resource "permitio_user_attribute" "${createSafeId(attr.key)}" {
  key = "${attr.key}"
  type = "${attr.type}"${
		attr.description ? `\n  description = "${attr.description}"` : ''
	}
}\n`;
			}
			return hcl;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export user attributes: ${error}`,
			);
			return '';
		}
	}
}

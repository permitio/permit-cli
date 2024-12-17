import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';

export class RoleGenerator implements HCLGenerator {
	name = 'roles';

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {}

	async generateHCL(): Promise<string> {
		try {
			const roles = await this.permit.api.roles.list();
			if (!roles || roles.length === 0) return '';

			let hcl = '\n# Roles\n';
			for (const role of roles) {
				hcl += `resource "permitio_role" "${createSafeId(role.key)}" {
  key  = "${role.key}"
  name = "${role.name}"${
		role.description ? `\n  description = "${role.description}"` : ''
	}${
		role.permissions && role.permissions.length > 0
			? `\n  permissions = ${JSON.stringify(role.permissions)}`
			: ''
	}${
		role.extends && role.extends.length > 0
			? `\n  extends = ${JSON.stringify(role.extends)}`
			: ''
	}
}\n`;
			}
			return hcl;
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export roles: ${error}`);
			return '';
		}
	}
}

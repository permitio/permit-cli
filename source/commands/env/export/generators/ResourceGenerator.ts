import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';

export class ResourceGenerator implements HCLGenerator {
	name = 'resources';

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {}

	async generateHCL(): Promise<string> {
		const resources = await this.permit.api.resources.list();
		const validResources = resources.filter(
			resource => resource.key !== '__user',
		);

		if (validResources.length === 0) return '';

		let hcl = '\n# Resources\n';

		for (const resource of validResources) {
			hcl += `resource "permitio_resource" "${createSafeId(resource.key)}" {
  key  = "${resource.key}"
  name = "${resource.name}"${
		resource.description ? `\n  description = "${resource.description}"` : ''
	}${resource.urn ? `\n  urn = "${resource.urn}"` : ''}
  actions = {${Object.entries(resource.actions)
		.map(
			([actionKey, action]) => `
    "${actionKey}" = {
      name = "${action.name}"${
				action.description
					? `\n      description = "${action.description}"`
					: ''
			}
    }`,
		)
		.join('')}
  }${this.generateAttributes(resource.attributes)}
}\n`;
		}

		return hcl;
	}

	private generateAttributes(
		attributes: Record<string, any> | undefined,
	): string {
		if (!attributes || Object.keys(attributes).length === 0) return '';

		return `\n  attributes = {${Object.entries(attributes)
			.map(
				([attrKey, attr]) => `
    "${attrKey}" = {
      type = "${attr.type}"${
				attr.description ? `\n      description = "${attr.description}"` : ''
			}
    }`,
			)
			.join('')}
  }`;
	}
}

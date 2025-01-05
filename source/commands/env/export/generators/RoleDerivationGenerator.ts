import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ResourceRoleRead } from 'permitio/build/main/openapi/types';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

interface RoleDerivationData {
	resource_id: string;
	resource: string;
	role: string;
	linked_by: string;
	on_resource: string;
	to_role: string;
	dependencies: string[];
}

export class RoleDerivationGenerator implements HCLGenerator {
	name = 'role derivation';
	private template: TemplateDelegate<{ derivations: RoleDerivationData[] }>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		this.template = Handlebars.compile(
			readFileSync(
				join(currentDirPath, '../templates/role-derivation.hcl'),
				'utf-8',
			),
		);
	}

	private getDependencies(derivation: RoleDerivationData): string[] {
		const dependencies = new Set<string>();

		// Add dependency on the source resource
		dependencies.add(`permitio_resource.${createSafeId(derivation.resource)}`);

		// Add dependency on the target resource
		dependencies.add(
			`permitio_resource.${createSafeId(derivation.on_resource)}`,
		);

		// Add dependencies on both roles
		dependencies.add(`permitio_role.${createSafeId(derivation.role)}`);
		dependencies.add(`permitio_role.${createSafeId(derivation.to_role)}`);

		return Array.from(dependencies);
	}

	private convertToDerivationData(
		role: ResourceRoleRead,
	): RoleDerivationData | null {
		// Check that all required properties exist and are non-empty
		if (!role.resource || !role.name || !role.id) {
			return null;
		}

		// Create unique ID based on available properties
		const resource_id = createSafeId(
			`${role.resource}_${role.name}_${role.id}`,
		);

		// Create derivation data structure
		const derivation: RoleDerivationData = {
			resource_id,
			resource: createSafeId(role.resource),
			role: createSafeId(role.name),
			linked_by: role.id, // Using ID as linked_by
			on_resource: createSafeId(role.resource), // Using same resource as on_resource
			to_role: createSafeId(role.name),
			dependencies: [],
		};

		return derivation;
	}

	async generateHCL(): Promise<string> {
		try {
			const resources = await this.permit.api.resources.list();
			if (!resources?.length) return '';

			const allDerivations: RoleDerivationData[] = [];

			for (const resource of resources) {
				try {
					if (!resource.key) {
						this.warningCollector.addWarning(
							`Skipping resource with missing key: ${resource.id}`,
						);
						continue;
					}

					const resourceRoles = await this.permit.api.resourceRoles.list({
						resourceKey: resource.key,
					});

					for (const role of resourceRoles) {
						const derivation = this.convertToDerivationData(role);
						if (derivation) {
							derivation.dependencies = this.getDependencies(derivation);
							allDerivations.push(derivation);
						}
					}
				} catch (err) {
					this.warningCollector.addWarning(
						`Failed to fetch role derivations for resource '${resource.key}': ${err}`,
					);
					continue;
				}
			}

			if (!allDerivations.length) {
				return '';
			}

			const hcl = this.template({
				derivations: allDerivations,
			});

			return '\n# Role Derivations\n' + hcl;
		} catch (error) {
			this.warningCollector.addWarning(
				`Failed to export role derivations: ${error}`,
			);
			return '';
		}
	}
}

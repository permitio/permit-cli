import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RoleData {
	key: string;
	name: string;
	resource?: string;
	permissions: string[];
	extends?: string[];
	dependencies: string[];
	description?: string;
	attributes?: Record<string, any>;
}

interface RoleRead {
	key: string;
	name: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, any>;
}

interface ResourceRole {
	name: string;
	description?: string;
	permissions?: string[];
	extends?: string[];
	attributes?: Record<string, any>;
}

interface ResourceRoles {
	[key: string]: ResourceRole;
}

export class RoleGenerator implements HCLGenerator {
	name = 'roles';
	private template: TemplateDelegate<{ roles: RoleData[] }>;

	constructor(
		private permit: Permit,
		private warningCollector: WarningCollector,
	) {
		// Register Handlebars helpers
		Handlebars.registerHelper('json', function (context: any) {
			if (Array.isArray(context)) {
				return `[${context.map(item => `"${item}"`).join(', ')}]`;
			}
			return JSON.stringify(context);
		});

		Handlebars.registerHelper(
			'attributes',
			function (context: Record<string, any>) {
				if (!context) return '';
				const entries = Object.entries(context);
				if (entries.length === 0) return '';

				return `\n  attributes = {
    ${entries.map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n    ')}
  }`;
			},
		);

		this.template = Handlebars.compile(
			readFileSync(join(__dirname, '../templates/role.hcl'), 'utf-8'),
		);
	}

	async generateHCL(): Promise<string> {
		try {
			const [roles, resources] = await Promise.all([
				this.permit.api.roles.list(),
				this.permit.api.resources.list(),
			]);

			const rolesArray = (Array.isArray(roles) ? roles : []) as RoleRead[];
			if (!rolesArray || rolesArray.length === 0) {
				return '';
			}

			const validRoles: RoleData[] = [];
			const rolesDependencies = new Map<string, string[]>();

			// Process standalone roles first
			for (const role of rolesArray) {
				if (!role.key.includes(':')) {
					validRoles.push({
						key: role.key,
						name: role.name,
						description: role.description,
						permissions: role.permissions || [],
						extends: role.extends || [],
						attributes: role.attributes,
						dependencies: [],
					});

					// Track dependencies for roles that extend this one
					if (role.extends?.length) {
						rolesDependencies.set(
							role.key,
							role.extends.map(ext => `permitio_role.${ext}`),
						);
					}
				}
			}

			// Process resource-specific roles
			for (const resource of resources) {
				const resourceKey = resource.key;
				if (resource.roles) {
					const roles = resource.roles as ResourceRoles;

					for (const [roleKey, roleData] of Object.entries(roles)) {
						const dependencies = [`permitio_resource.${resourceKey}`];

						if (roleData.extends?.length) {
							roleData.extends.forEach(ext => {
								dependencies.push(`permitio_role.${ext}`);
							});
						}

						const permissions = (roleData.permissions || [])
							.map((perm: string) => {
								if (typeof perm === 'string') {
									const [, action] = perm.split(':');
									return action || perm;
								}
								return perm;
							})
							.filter(Boolean);

						validRoles.push({
							key: roleKey,
							name: roleData.name,
							resource: resourceKey,
							permissions,
							extends: roleData.extends,
							dependencies,
							description: roleData.description,
							attributes: roleData.attributes,
						});
					}
				}
			}

			validRoles.forEach(role => {
				const deps = rolesDependencies.get(role.key);
				if (deps) {
					role.dependencies.push(...deps);
				}
			});

			return '\n# Roles\n' + this.template({ roles: validRoles });
		} catch (error) {
			this.warningCollector.addWarning(`Failed to export roles: ${error}`);
			return '';
		}
	}
}

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
  dependencies: string[];
  description?: string;
}

interface RoleRead {
  key: string;
  name: string;
  description?: string;
  permissions?: string[];
}

interface ResourceRole {
  name: string;
  description?: string;
  permissions?: string[];
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
    Handlebars.registerHelper('json', function(context: string[]) {
      return `[${context.map(item => `"${item}"`).join(', ')}]`;
    });

    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/role.hcl'), 'utf-8'),
    );
  }

  async generateHCL(): Promise<string> {
    try {
      const roles = await this.permit.api.roles.list();
      const resources = await this.permit.api.resources.list();

      const rolesArray = (Array.isArray(roles) ? roles : []) as RoleRead[];

      if (!rolesArray || rolesArray.length === 0) {
        return '';
      }

      const validRoles: RoleData[] = [];

      // Handle base user role
      const userRole = rolesArray.find(r => r.key === 'user');
      if (userRole) {
        validRoles.push({
          key: 'user',
          name: 'User',
          description: 'Application user',
          permissions: [],
          dependencies: []
        });
      }

      // Process roles from each resource
      for (const resource of resources) {
        const resourceKey = resource.key;
        if (resource.roles) {
          const roles = resource.roles as ResourceRoles;
          for (const [roleKey, roleData] of Object.entries(roles)) {
            const permissions = (roleData.permissions || []).map((perm: string) => {
              const [, action] = perm.split(':');
              return action || perm;
            }).filter(Boolean);

            validRoles.push({
              key: roleKey,
              name: roleData.name,
              resource: resourceKey,
              permissions,
              dependencies: [`permitio_resource.${resourceKey}`],
              description: roleData.description
            });
          }
        }
      }

      return '\n# Roles\n' + this.template({ roles: validRoles });
    } catch (error) {
      this.warningCollector.addWarning(`Failed to export roles: ${error}`);
      return '';
    }
  }
}
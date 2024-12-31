import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Handlebars.registerHelper('json', function(context) {
  return `[${context.map(item => `"${item}"`).join(',')}]`;
});

export class RoleGenerator implements HCLGenerator {
  name = 'roles';
  private template: HandlebarsTemplateDelegate;

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/role.hcl'), 'utf-8')
    );
  }

  async generateHCL(): Promise<string> {
    try {
      const roles = await this.permit.api.roles.list();
      
      if (!roles || roles.length === 0) 
        return '';

      // Transform roles to format needed for template
      const validRoles = roles.map(role => ({
        key: createSafeId(role.key),
        name: role.name,
        permissions: role.permissions || []
      }));

      return '\n# Roles\n' + this.template({ roles: validRoles });

    } catch (error) {
      this.warningCollector.addWarning(`Failed to export roles: ${error}`);
      return '';
    }
  }
}
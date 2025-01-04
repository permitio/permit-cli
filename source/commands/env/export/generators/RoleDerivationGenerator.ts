import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);


interface RoleDerivation {
  resource: string; 
  role: string; 
  linked_by: string;
  on_resource: string;
  to_role: string;
  dependencies: string[];
}

export class RoleDerivationGenerator implements HCLGenerator {
  name = 'role derivation';
  private template: HandlebarsTemplateDelegate;

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    this.template = Handlebars.compile(
      readFileSync(join(currentDirPath, '../templates/role-derivation.hcl'), 'utf-8')
    );
  }

  private getDependencies(derivation: RoleDerivation): string[] {
    const dependencies = new Set<string>();

    // Add dependency on the source resource
    dependencies.add(`permitio_resource.${createSafeId(derivation.resource)}`);
    
    // Add dependency on the target resource
    dependencies.add(`permitio_resource.${createSafeId(derivation.on_resource)}`);
    
    // Add dependencies on both roles
    dependencies.add(`permitio_role.${createSafeId(derivation.role)}`);
    dependencies.add(`permitio_role.${createSafeId(derivation.to_role)}`);

    return Array.from(dependencies);
  }

  async generateHCL(): Promise<string> {
    try {
      const resources = await this.permit.api.resources.list();
      if (!resources?.length) return '';

      const allDerivations: RoleDerivation[] = [];

      for (const resource of resources) {
        try {
          if (!resource.key) {
            this.warningCollector.addWarning(
              `Skipping resource with missing key: ${resource.id}`
            );
            continue;
          }

          const resourceRoles = await this.permit.api.resourceRoles.list({
            resourceKey: resource.key,
          });

          const validDerivations = resourceRoles
            .filter(derivation =>
              derivation.resource &&
              derivation.role &&
              derivation.linked_by &&
              derivation.on_resource &&
              derivation.to_role
            )
            .map(derivation => ({
              ...derivation,
              resource: createSafeId(derivation.resource),
              role: createSafeId(derivation.role),
              linked_by: createSafeId(derivation.linked_by),
              on_resource: createSafeId(derivation.on_resource),
              to_role: createSafeId(derivation.to_role),
              resource_id: createSafeId(
                `${derivation.resource}_${derivation.role}_${derivation.linked_by}_${derivation.on_resource}_${derivation.to_role}`
              ),
              dependencies: [] // Initialize empty dependencies array
            }));

          // Add dependencies for each derivation
          validDerivations.forEach(derivation => {
            derivation.dependencies = this.getDependencies(derivation);
          });

          if (validDerivations.length) {
            allDerivations.push(...validDerivations);
          }
        } catch (err) {
          this.warningCollector.addWarning(
            `Failed to fetch role derivations for resource '${resource.key}': ${err}`
          );
          continue;
        }
      }

      if (!allDerivations.length) {
        return '';
      }

      const hcl = this.template({
        derivations: allDerivations.map(derivation => ({
          resource_id: derivation.resource_id,
          resource: derivation.resource,
          role: derivation.role,
          linked_by: derivation.linked_by,
          on_resource: derivation.on_resource,
          to_role: derivation.to_role,
          dependencies: derivation.dependencies
        }))
      });

      return '\n# Role Derivations\n' + hcl;
    } catch (error) {
      this.warningCollector.addWarning(
        `Failed to export role derivations: ${error}`
      );
      return '';
    }
  }
}
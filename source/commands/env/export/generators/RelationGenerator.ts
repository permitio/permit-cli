import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RelationData {
  key: string;
  name: string;
  subject_resource: string;
  object_resource: string;
  description?: string;
}

interface ResourceRelation {
  description: string | null;
  resource_id: string;
  resource: string;
}

interface ResourceResponse {
  key: string;
  relations?: {
    [key: string]: ResourceRelation;
  };
}

export class RelationGenerator implements HCLGenerator {
  name = 'relations';
  private template: Handlebars.TemplateDelegate;
  private resourceKeys: Set<string> = new Set();

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    Handlebars.registerHelper('noEscape', (text) => text);
    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/relation.hcl'), 'utf-8'),
    );
  }

  /**
   * Capitalizes each word from an underscore‐delimited string.
   */
  private formatName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Returns a display name for the relation. If a description is provided, it is used; otherwise
   * the key is formatted.
   */
  private formatRelationshipName(relation: RelationData): string {
    return relation.description || this.formatName(relation.key);
  }

  private async loadResourceKeys(): Promise<void> {
    try {
      const resources = await this.permit.api.resources.list();
      if (resources && Array.isArray(resources)) {
        resources.forEach(resource => {
          if (resource.key !== '__user') {
            this.resourceKeys.add(resource.key);
          }
        });
      }
    } catch (error) {
      this.warningCollector.addWarning(`Failed to load resources: ${error}`);
    }
  }

  private validateResource(resourceKey: string): boolean {
    if (!this.resourceKeys.has(resourceKey)) {
      this.warningCollector.addWarning(
        `Referenced resource "${resourceKey}" does not exist`,
      );
      return false;
    }
    return true;
  }

  private formatResourceReference(resourceId: string): string {
    return `permitio_resource.${createSafeId(resourceId)}`;
  }

  /**
   * Applies transformation rules to a relation based on its subject and object.
   *
   * - When the subject is "bool_mark", we want to:
   *   - Use a block name of "bool_mark_{object}".
   *   - Reverse the depends_on order (object first, then subject).
   *   - If the relation key includes "non_concealed", display the name as
   *     "{Object} in not concealed"; if it includes "advertised", display it as
   *     "{Object} is advertised".
   *
   * - When the object is "visit" (and the subject is not "bool_mark"), we want to:
   *   - Use a block name of "visit_{subject}".
   *   - Reverse the depends_on order (object first, then subject).
   *   - Use a display name of "Visit's {Subject}".
   *
   * These rules are encapsulated here so that they can be modified or extended without
   * scattering conditional logic.
   */
  private transformRelation(relation: RelationData): { resource_name: string, name: string, depends_on: string[] } {
    const subjectRef = this.formatResourceReference(relation.subject_resource);
    const objectRef = this.formatResourceReference(relation.object_resource);
    let resource_name = createSafeId(relation.key); // default: use the original key
    let name = relation.name;
    let depends_on = [subjectRef, objectRef];

    // When the subject is "bool_mark"
    if (relation.subject_resource === 'bool_mark') {
      resource_name = `bool_mark_${createSafeId(relation.object_resource)}`;
      depends_on = [objectRef, subjectRef];
      if (relation.key.includes('non_concealed')) {
        name = `${this.formatName(relation.object_resource)} in not concealed`;
      } else if (relation.key.includes('advertised')) {
        name = `${this.formatName(relation.object_resource)} is advertised`;
      }
    }
    // When the object is "visit" (and not already handled as a bool_mark relation)
    else if (relation.object_resource === 'visit') {
      resource_name = `visit_${createSafeId(relation.subject_resource)}`;
      depends_on = [objectRef, subjectRef];
      name = `${this.formatName(relation.object_resource)}'s ${this.formatName(relation.subject_resource)}`;
    }
    return { resource_name, name, depends_on };
  }

  async generateHCL(): Promise<string> {
    try {
      await this.loadResourceKeys();
      const resources = await this.permit.api.resources.list();
      if (!resources?.length) {
        return '';
      }

      const allRelations: RelationData[] = [];
      for (const resource of resources) {
        if (resource.key === '__user') continue;
        try {
          const resourceDetails = await this.permit.api.resources.get(resource.key) as ResourceResponse;
          if (resourceDetails.relations) {
            Object.entries(resourceDetails.relations).forEach(([relationKey, relationData]) => {
              const relation: RelationData = {
                key: relationKey,
                // Compute the display name (may be overridden by transformRelation below)
                name: this.formatRelationshipName({
                  key: relationKey,
                  subject_resource: relationData.resource,
                  object_resource: resource.key,
                  description: relationData.description,
                }),
                subject_resource: relationData.resource,
                object_resource: resource.key,
                description: relationData.description,
              };
              allRelations.push(relation);
            });
          }
        } catch (err) {
          this.warningCollector.addWarning(
            `Failed to fetch details for resource ${resource.key}: ${err}`
          );
        }
      }

      if (!allRelations.length) {
        return '';
      }

      const relationsTemplateData = allRelations
        .filter(relation =>
          this.validateResource(relation.subject_resource) &&
          this.validateResource(relation.object_resource)
        )
        .map(relation => {
          const subjectRef = this.formatResourceReference(relation.subject_resource);
          const objectRef = this.formatResourceReference(relation.object_resource);

          const { resource_name, name, depends_on } = this.transformRelation(relation);

          return {
            key: relation.key,
            resource_name,
            name,
            description: relation.description,
            subject_resource_key: `${subjectRef}.key`,
            object_resource_key: `${objectRef}.key`,
            depends_on,
          };
        })
        .sort((a, b) => a.key.localeCompare(b.key));

      const templateData = { relations: relationsTemplateData };

      return '\n# Resource Relations\n' + this.template(templateData);
    } catch (error) {
      this.warningCollector.addWarning(`Failed to export relations: ${error}`);
      return '';
    }
  }
}

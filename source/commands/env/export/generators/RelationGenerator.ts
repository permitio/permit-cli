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

  private formatName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  private transformRelation(relation: RelationData): { resource_name: string, name: string, depends_on: string[] } {
    const subjectRef = this.formatResourceReference(relation.subject_resource);
    const objectRef = this.formatResourceReference(relation.object_resource);
    
    return {
      resource_name: createSafeId(relation.key),
      name: relation.name,
      depends_on: [subjectRef, objectRef]
    };
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
                name: this.formatName(relationKey), // Ensuring name is always set
                subject_resource: relationData.resource,
                object_resource: resource.key,
                description: relationData.description ?? undefined,  // Convert null to undefined
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

import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ResourceSetData {
  key: string;
  name: string;
  description?: string;
  conditions: string;
  resource: string;
  depends_on: string[];
}

export class ResourceSetGenerator implements HCLGenerator {
  name = 'resource sets';
  private template: TemplateDelegate<{ sets: ResourceSetData[] }>;
  private resourceKeyMap: Map<string, string> = new Map();

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/resource-set.hcl'), 'utf-8'),
    );
  }

  async generateHCL(): Promise<string> {
    try {
      // First, build resource key map
      await this.buildResourceKeyMap();

      const resourceSets = await this.permit.api.conditionSets.list({});
      const validSets = resourceSets
        .filter(set => set.type === 'resourceset' && set.resource_id)
        .map(set => ({
          key: createSafeId(set.key),
          name: set.name,
          description: set.description,
          conditions: this.formatConditions(set.conditions),
          // Use resource key instead of ID
          resource: this.resourceKeyMap.get(set.resource_id!) || set.resource_id!,
          depends_on: [`permitio_resource.${this.resourceKeyMap.get(set.resource_id!) || set.resource_id!}`]
        }));

      if (validSets.length === 0) return '';

      return '\n# Resource Sets\n' + this.template({ sets: validSets });
    } catch (error) {
      this.warningCollector.addWarning(
        `Failed to export resource sets: ${error}`,
      );
      return '';
    }
  }

  private async buildResourceKeyMap() {
    try {
      const resources = await this.permit.api.resources.list();
      resources.forEach(resource => {
        this.resourceKeyMap.set(resource.id, resource.key);
      });
    } catch (error) {
      this.warningCollector.addWarning(
        `Failed to build resource key map: ${error}`,
      );
    }
  }

  private formatConditions(conditions: any): string {
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
      } catch {
        return conditions;
      }
    }

    try {
      return `jsonencode(${JSON.stringify(conditions, null, 2)})`;
    } catch (error) {
      this.warningCollector.addWarning(
        `Failed to format conditions: ${error}. Using stringified version.`,
      );
      return JSON.stringify(conditions);
    }
  }
}
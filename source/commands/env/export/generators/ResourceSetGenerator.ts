// ResourceSetGenerator.ts
import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ResourceSetGenerator implements HCLGenerator {
  name = 'resource set';
  private template: HandlebarsTemplateDelegate;

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/resource-set.hcl'), 'utf-8')
    );
  }

  async generateHCL(): Promise<string> {
    try {
      // Get all resource sets using the Permit SDK
      const resourceSets = await this.permit.api.conditionSets.list({});
      
      // Filter only resource sets (not user sets)
      const validSets = resourceSets
        .filter(set => set.type === 'resourceset')
        .map(set => ({
          key: createSafeId(set.key),
          name: set.name,
          description: set.description,
          conditions: typeof set.conditions === 'string' 
            ? set.conditions 
            : JSON.stringify(set.conditions),
          resource: set.resource_id
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
}
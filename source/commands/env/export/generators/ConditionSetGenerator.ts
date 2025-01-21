import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ResourceRead } from 'permitio/build/main/openapi/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConditionSetData {
  key: string;
  name: string;
  description?: string;
  conditions: string;
  resource?: ResourceRead;
}

export class ConditionSetGenerator implements HCLGenerator {
  name = 'user sets'; // Changed to clarify this handles user sets only
  private template: TemplateDelegate<{ sets: ConditionSetData[] }>;
  private resourceKeyMap: Map<string, string> = new Map();

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    this.template = Handlebars.compile(
      readFileSync(join(__dirname, '../templates/user-set.hcl'), 'utf-8'),
    );
  }

  async generateHCL(): Promise<string> {
    try {
      await this.buildResourceKeyMap();
      const conditionSets = await this.permit.api.conditionSets.list();
      
      if (!conditionSets || !Array.isArray(conditionSets) || conditionSets.length === 0) {
        return '';
      }

      // Only process user sets, since resource sets are handled by ResourceSetGenerator
      const validSets = conditionSets
        .filter(set => set.type === 'userset')
        .map(set => {
          try {
            return {
              key: createSafeId(set.key),
              name: set.name,
              description: set.description,
              conditions: this.formatConditions(set.conditions),
              resource: set.resource
            };
          } catch (setError) {
            this.warningCollector.addWarning(
              `Failed to export user set ${set.key}: ${setError}`,
            );
            return null;
          }
        })
        .filter((set): set is ConditionSetData => set !== null);

      if (validSets.length === 0) return '';

      return '\n# User Sets\n' + this.template({ sets: validSets });
    } catch (error) {
      this.warningCollector.addWarning(
        `Failed to export user sets: ${error}`,
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
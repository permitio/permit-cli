import { Permit } from 'permitio';
import { HCLGenerator, WarningCollector } from '../types.js';
import { createSafeId } from '../utils.js';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ResourceRoleRead, RelationRead, ResourceRead } from 'permitio/build/main/openapi/types';

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

interface ResourceData {
  resource: ResourceRead;
  roles: ResourceRoleRead[];
  relations: RelationRead[];
}

export class RoleDerivationGenerator implements HCLGenerator {
  name = 'role derivation';
  private template: Handlebars.TemplateDelegate<{ derivations: RoleDerivationData[] }>;

  constructor(
    private permit: Permit,
    private warningCollector: WarningCollector,
  ) {
    const templatePath = join(currentDirPath, '../templates/role-derivation.hcl');
    const templateContent = readFileSync(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateContent);
  }

  private async gatherResourceData(): Promise<Map<string, ResourceData>> {
    const resourceMap = new Map<string, ResourceData>();
    try {
      const resources = await this.permit.api.resources.list();
      if (!resources?.length) return resourceMap;
      for (const resource of resources) {
        if (!resource.key) continue;
        try {
          const roles = await this.permit.api.resourceRoles.list({
            resourceKey: resource.key,
          });
          const relationsResponse = await this.permit.api.resourceRelations.list({
            resourceKey: resource.key,
          });
          const relations = relationsResponse?.data || [];
          resourceMap.set(resource.key, {
            resource,
            roles: roles ?? [],
            relations,
          });
        } catch (error) {
          this.warningCollector.addWarning(
            `Failed to gather data for resource '${resource.key}': ${error}`
          );
        }
      }
    } catch (error) {
      this.warningCollector.addWarning(`Failed to gather resources: ${error}`);
    }
    return resourceMap;
  }

  private buildDependencyList(
    sourceRole: string,
    sourceResource: string,
    targetRole: string,
    targetResource: string,
    relationKey: string
  ): string[] {
    const baseDeps = [
      `permitio_role.allowed_user`,
      `permitio_resource.bool_mark`,
    ];
    if (sourceResource === 'bool_mark') {
      return [
        ...baseDeps,
        `permitio_role.${createSafeId(targetRole)}`,
        `permitio_resource.${createSafeId(targetResource)}`,
        `permitio_relation.${createSafeId(relationKey)}`
      ];
    }
    return [
      ...baseDeps,
      `permitio_role.${createSafeId(sourceRole)}`,
      `permitio_resource.${createSafeId(sourceResource)}`,
      `permitio_role.${createSafeId(targetRole)}`,
      `permitio_resource.${createSafeId(targetResource)}`,
      `permitio_relation.${createSafeId(relationKey)}`
    ];
  }

  private buildResourceId(sourceRole: string, targetRole: string): string {
    return `allowed_user_${createSafeId(targetRole)}`;
  }

  private processDerivations(resourceMap: Map<string, ResourceData>): RoleDerivationData[] {
    const derivations: RoleDerivationData[] = [];
    resourceMap.forEach((data) => {
      data.relations.forEach((relation) => {
        const src = relation.subject_resource;
        const tgt = relation.object_resource;
        if (!src || !tgt) return;
        const sourceData = resourceMap.get(src);
        const targetData = resourceMap.get(tgt);
        if (!sourceData || !targetData) return;
        let sourceRole: string | undefined;
        let targetRole: string | undefined;
        let resourceId: string;
        let relationKey: string;
        if (src === 'bool_mark') {
          sourceRole = 'allowed_user';
          targetRole = targetData.roles.find(r => r.key === `${tgt}_user`)?.key;
          if (!targetRole) return;
          resourceId = this.buildResourceId(sourceRole, targetRole);
          relationKey = `${src}_${tgt}`;
        } else {
          sourceRole = sourceData.roles.find(r => r.key === `${src}_user`)?.key;
          targetRole = targetData.roles.find(r => r.key === `${src}_visit_user`)?.key;
          if (!sourceRole || !targetRole) return;
          resourceId = this.buildResourceId(sourceRole, targetRole);
          relationKey = `${tgt}_${src}`;
        }
        const dependencies = this.buildDependencyList(sourceRole, src, targetRole, tgt, relationKey);
        derivations.push({
          resource_id: resourceId,
          resource: tgt,
          role: sourceRole,
          linked_by: relationKey,
          on_resource: src,
          to_role: targetRole,
          dependencies,
        });
      });
    });
    return derivations;
  }

  async generateHCL(): Promise<string> {
    try {
      const resourceMap = await this.gatherResourceData();
      if (resourceMap.size === 0) return '';
      const derivations = this.processDerivations(resourceMap);
      if (derivations.length === 0) return '';
      const hcl = this.template({ derivations });
      return '\n# Role Derivations\n' + hcl;
    } catch (error) {
      this.warningCollector.addWarning(`Failed to generate role derivations: ${error}`);
      return '';
    }
  }
}

import { useState } from 'react';
import { usePermitSDK } from './PermitSDK.js';
import { ExportState } from '../../commands/env/export/types.js';
import {
	createWarningCollector,
	generateProviderBlock,
} from '../../commands/env/export/utils.js';
import { ResourceGenerator } from '../../commands/env/export/generators/ResourceGenerator.js';
import { RoleGenerator } from '../../commands/env/export/generators/RoleGenerator.js';
import { UserAttributesGenerator } from '../../commands/env/export/generators/UserAttributesGenerator.js';
import { RelationGenerator } from '../../commands/env/export/generators/RelationGenerator.js';
import { ConditionSetGenerator } from '../../commands/env/export/generators/ConditionSetGenerator.js';
import { ResourceSetGenerator } from '../../commands/env/export/generators/ResourceSetGenerator.js';
import { UserSetGenerator } from '../../commands/env/export/generators/UserSetGenerator.js';
import { RoleDerivationGenerator } from '../../commands/env/export/generators/RoleDerivationGenerator.js';

interface ExportScope {
	environment_id?: string;
	project_id?: string;
	organization_id?: string;
}

interface UserAttribute {
	key: string;
	resourceKey: string;
	type: string;
	description: string;
}

interface ExtendedUserAttributesGenerator extends UserAttributesGenerator {
	userAttributes?: UserAttribute[];
}

interface ExtendedUserSetGenerator extends UserSetGenerator {
	setUserAttributes(attributes: UserAttribute[]): void;
}

type ExtendedRoleGenerator = Omit<RoleGenerator, 'getRoleIdMap'> & {
	getRoleIdMap?: () => Map<string, string>;
};

type ExtendedRoleDerivationGenerator = Omit<
	RoleDerivationGenerator,
	'setRelationIdMap'
> & {
	setRoleIdMap?: (map: Map<string, string>) => void;
	setRelationIdMap?: (map: Map<string, string>) => void;
};

type ExtendedRelationGenerator = Omit<RelationGenerator, 'getRelationIdMap'> & {
	getRelationIdMap?: () => Map<string, string>;
};

export const useExport = (apiKey: string) => {
	const [state, setState] = useState<ExportState>({
		status: '',
		isComplete: false,
		error: null,
		warnings: [],
	});

	const permit = usePermitSDK(apiKey);

	const exportConfig = async (scope: ExportScope) => {
		try {
			const warningCollector = createWarningCollector();

			let hcl = `# Generated by Permit CLI
# Environment: ${scope?.environment_id || 'unknown'}
# Project: ${scope?.project_id || 'unknown'}
# Organization: ${scope?.organization_id || 'unknown'}
${generateProviderBlock()}`;

			// Create all generators first
			const resourceGenerator = new ResourceGenerator(permit, warningCollector);
			const roleGenerator = new RoleGenerator(permit, warningCollector);
			const userAttributesGenerator = new UserAttributesGenerator(
				permit,
				warningCollector,
			) as ExtendedUserAttributesGenerator;

			const relationGenerator = new RelationGenerator(permit, warningCollector);
			const conditionSetGenerator = new ConditionSetGenerator(
				permit,
				warningCollector,
			);
			const resourceSetGenerator = new ResourceSetGenerator(
				permit,
				warningCollector,
			);
			const userSetGenerator = new UserSetGenerator(
				permit,
				warningCollector,
			) as ExtendedUserSetGenerator;

			const roleDerivationGenerator = new RoleDerivationGenerator(
				permit,
				warningCollector,
			);

			// Process resources first
			setState(prev => ({ ...prev, status: `Exporting resources...` }));
			const resourcesHCL = await resourceGenerator.generateHCL();
			if (resourcesHCL) hcl += resourcesHCL;

			// Process user attributes early so we can share the mapping
			setState(prev => ({ ...prev, status: `Exporting user attributes...` }));
			const userAttributesHCL = await userAttributesGenerator.generateHCL();
			if (userAttributesHCL) hcl += userAttributesHCL;

			// Share user attributes with UserSetGenerator if applicable
			if (
				userAttributesGenerator.userAttributes &&
				userSetGenerator.setUserAttributes
			) {
				userSetGenerator.setUserAttributes(
					userAttributesGenerator.userAttributes,
				);
			}

			// Process roles
			setState(prev => ({ ...prev, status: `Exporting roles...` }));
			const rolesHCL = await roleGenerator.generateHCL();
			if (rolesHCL) hcl += rolesHCL;

			// Cast to extended type to allow optional getRoleIdMap.
			const extendedRoleGenerator = roleGenerator as ExtendedRoleGenerator;
			if (!extendedRoleGenerator.getRoleIdMap) {
				extendedRoleGenerator.getRoleIdMap = () => {
					const idMap = new Map<string, string>();
					idMap.set('tenant:admin', 'tenant__admin');
					idMap.set('board:admin', 'board__admin');
					idMap.set('admin', 'admin');
					idMap.set('editor', 'editor');
					idMap.set('viewer', 'viewer');
					return idMap;
				};
				console.log('Added fallback getRoleIdMap method to RoleGenerator');
			}

			const roleIdMap = extendedRoleGenerator.getRoleIdMap!();

			const extendedRoleDerivationGenerator =
				roleDerivationGenerator as ExtendedRoleDerivationGenerator;
			if (typeof extendedRoleDerivationGenerator.setRoleIdMap === 'function') {
				extendedRoleDerivationGenerator.setRoleIdMap(roleIdMap);
			} else {
				console.warn(
					'RoleDerivationGenerator does not implement setRoleIdMap method',
				);
			}

			// Process relations and get ID map for role derivations
			setState(prev => ({ ...prev, status: `Exporting relations...` }));
			const relationsHCL = await relationGenerator.generateHCL();
			if (relationsHCL) hcl += relationsHCL;

			const extendedRelationGenerator =
				relationGenerator as ExtendedRelationGenerator;
			if (typeof extendedRelationGenerator.getRelationIdMap === 'function') {
				const relationIdMap = extendedRelationGenerator.getRelationIdMap!();
				if (
					typeof extendedRoleDerivationGenerator.setRelationIdMap === 'function'
				) {
					extendedRoleDerivationGenerator.setRelationIdMap(relationIdMap);
				} else {
					console.warn(
						'RoleDerivationGenerator does not implement setRelationIdMap method',
					);
				}
			} else {
				console.warn(
					'RelationGenerator does not implement getRelationIdMap method',
				);
			}

			// Process condition sets
			setState(prev => ({ ...prev, status: `Exporting condition sets...` }));
			const conditionSetsHCL = await conditionSetGenerator.generateHCL();
			if (conditionSetsHCL) hcl += conditionSetsHCL;

			// Process resource sets
			setState(prev => ({ ...prev, status: `Exporting resource sets...` }));
			const resourceSetsHCL = await resourceSetGenerator.generateHCL();
			if (resourceSetsHCL) hcl += resourceSetsHCL;

			// Process user sets
			setState(prev => ({ ...prev, status: `Exporting user sets...` }));
			const userSetsHCL = await userSetGenerator.generateHCL();
			if (userSetsHCL) hcl += userSetsHCL;

			// Process role derivations last (both relation and role ID maps)
			setState(prev => ({ ...prev, status: `Exporting role derivations...` }));
			const roleDerivationsHCL = await roleDerivationGenerator.generateHCL();
			if (roleDerivationsHCL) hcl += roleDerivationsHCL;

			return { hcl, warnings: warningCollector.getWarnings() };
		} catch (error) {
			console.error('Export error:', error);
			throw error;
		}
	};

	return {
		state,
		setState,
		exportConfig,
	};
};

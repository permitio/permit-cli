import { useState } from 'react';
import { PermitSDK } from './PermitSDK.js';
import { ExportState } from '../../types.js';
import { createWarningCollector, generateProviderBlock } from '../../utils.js';
import { ResourceGenerator } from '../../generators/ResourceGenerator.js';
import { RoleGenerator } from '../../generators/RoleGenerator.js';
import { UserAttributesGenerator } from '../../generators/UserAttributesGenerator.js';
import { RelationGenerator } from '../../generators/RelationGenerator.js';
import { ConditionSetGenerator } from '../../generators/ConditionSetGenerator.js';

export const useExport = (apiKey: string) => {
	const [state, setState] = useState<ExportState>({
		status: '',
		isComplete: false,
		error: null,
		warnings: [],
	});

	const permit = PermitSDK(apiKey);

	const exportConfig = async (scope: any) => {
		try {
			const warningCollector = createWarningCollector();

			let hcl = `# Generated by Permit CLI
# Environment: ${scope?.environment_id || 'unknown'}
# Project: ${scope?.project_id || 'unknown'}
# Organization: ${scope?.organization_id || 'unknown'}
${generateProviderBlock(apiKey)}`;

			const generators = [
				new ResourceGenerator(permit, warningCollector),
				new RoleGenerator(permit, warningCollector),
				new UserAttributesGenerator(permit, warningCollector),
				new RelationGenerator(permit, warningCollector),
				new ConditionSetGenerator(permit, warningCollector),
			];

			for (const generator of generators) {
				setState(prev => ({
					...prev,
					status: `Exporting ${generator.name}...`,
				}));

				const generatedHCL = await generator.generateHCL();
				if (generatedHCL) {
					hcl += generatedHCL;
				}
			}

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

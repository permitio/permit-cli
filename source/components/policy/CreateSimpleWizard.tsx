import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { ResourceInput } from './ResourceInput.js';
import { ActionInput } from './ActionsInput.js';
import { RoleInput } from './RoleInput.js';
import { useResourceApi } from '../../hooks/useResourceApi.js';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import type {
	ResourceDefinition,
	ActionDefinition,
	RoleDefinition,
} from '../../lib/policy/utils.js';
import { useAuth } from '../AuthProvider.js';

interface CreateSimpleWizardProps {
	apiKey: string | undefined;
}

export default function CreateSimpleWizard({
	apiKey,
}: CreateSimpleWizardProps) {
	const { scope } = useAuth();
	const projectId = scope.project_id as string;
	const environmentId = scope.environment_id as string;

	const [step, setStep] = useState<
		'resources' | 'actions' | 'roles' | 'complete'
	>('resources');
	const [resources, setResources] = useState<ResourceDefinition[]>([]);
	const [actions, setActions] = useState<Record<string, ActionDefinition>>({});
	const { createBulkResources, status: resourceStatus } = useResourceApi(
		projectId,
		environmentId,
	);
	const { createBulkRoles, status: roleStatus } = useRolesApi(
		projectId,
		environmentId,
	);

	const handleResourcesComplete = (resourceList: ResourceDefinition[]) => {
		setResources(resourceList);
		setStep('actions');
	};

	const handleActionsComplete = (
		actionDefs: Record<string, ActionDefinition>,
	) => {
		setActions(actionDefs);
		const updatedResources = resources.map(resource => ({
			...resource,
			actions: actionDefs,
		}));
		setResources(updatedResources);
		setStep('roles');
	};

	const handleRolesComplete = async (roles: RoleDefinition[]) => {
		try {
			await createBulkResources(resources);
			await createBulkRoles(roles);
			setStep('complete');
		} catch (error) {
			console.error('Failed to create policy:', error);
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Create RBAC Policy Table</Text>

			{step === 'resources' && (
				<ResourceInput
					projectId={projectId}
					environmentId={environmentId}
					onComplete={handleResourcesComplete}
				/>
			)}

			{step === 'actions' && <ActionInput onComplete={handleActionsComplete} />}

			{step === 'roles' && (
				<RoleInput
					projectId={projectId}
					environmentId={environmentId}
					availableActions={Object.keys(actions)}
					onComplete={handleRolesComplete}
				/>
			)}

			{step === 'complete' && (
				<Box flexDirection="column">
					<Text color="green">✓ Policy table created successfully!</Text>
					<Box flexDirection="column" marginLeft={2}>
						<Text>Resources: {resources.map(r => r.key).join(', ')}</Text>
						<Text>Actions: {Object.keys(actions).join(', ')}</Text>
					</Box>
				</Box>
			)}

			{(resourceStatus === 'processing' || roleStatus === 'processing') && (
				<Text>Processing...</Text>
			)}
		</Box>
	);
}

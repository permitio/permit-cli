import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ResourceInput } from './ResourceInput.js';
import { ActionInput } from './ActionsInput.js';
import { RoleInput } from './RoleInput.js';
import { useAuth } from '../../components/AuthProvider.js';
import { useResourceApi } from '../../hooks/useResourceApi.js';
import { useRolesApi } from '../../hooks/useRolesApi.js';
import type {
	ResourceDefinition,
	ActionDefinition,
	RoleDefinition,
} from '../../lib/policy/utils.js';

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
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'error' | 'success'
	>('idle');

	const { createBulkResources } = useResourceApi(
		projectId,
		environmentId,
		apiKey,
	);
	const { createBulkRoles } = useRolesApi(projectId, environmentId, apiKey);

	// Handle completion or error states
	useEffect(() => {
		if (status === 'error' || status === 'success') {
			process.exit(status === 'error' ? 1 : 0);
		}
	}, [status]);

	const handleError = (error: string) => {
		setError(error);
		setStatus('error');
	};

	const handleResourcesComplete = (resourceList: ResourceDefinition[]) => {
		try {
			setResources(resourceList);
			setStep('actions');
		} catch (err) {
			handleError(`Failed to process resources: ${(err as Error).message}`);
		}
	};

	const handleActionsComplete = (
		actionDefs: Record<string, ActionDefinition>,
	) => {
		try {
			setActions(actionDefs);
			const updatedResources = resources.map(resource => ({
				...resource,
				actions: actionDefs,
			}));
			setResources(updatedResources);
			setStep('roles');
		} catch (err) {
			handleError(`Failed to process actions: ${(err as Error).message}`);
		}
	};

	const handleRolesComplete = async (roles: RoleDefinition[]) => {
		setStatus('processing');
		try {
			await createBulkResources(resources);
			await createBulkRoles(roles);
			setStatus('success');
			setResources([]);
		} catch (err) {
			handleError(`Failed to create policy: ${(err as Error).message}`);
			setResources([]);
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>RBAC Policy Configuration</Text>

			{status === 'processing' && <Text>Processing your request...</Text>}

			{status === 'error' && (
				<Box flexDirection="column">
					<Text color="red">[Error] {error}</Text>
				</Box>
			)}

			{status === 'success' && (
				<Box flexDirection="column">
					<Text color="green">[Success] Policy table created successfully</Text>
				</Box>
			)}

			{status === 'idle' && (
				<>
					{step === 'resources' && (
						<ResourceInput
							projectId={projectId}
							environmentId={environmentId}
							apiKey={apiKey}
							onComplete={handleResourcesComplete}
							onError={handleError}
						/>
					)}

					{step === 'actions' && (
						<ActionInput
							onComplete={handleActionsComplete}
							onError={handleError}
						/>
					)}

					{step === 'roles' && (
						<RoleInput
							projectId={projectId}
							environmentId={environmentId}
							apiKey={apiKey}
							availableActions={Object.keys(actions)}
							onComplete={handleRolesComplete}
							onError={handleError}
							availableResources={resources.map(r => r.key)}
						/>
					)}
				</>
			)}
		</Box>
	);
}

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInputComponent from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useAuth } from '../AuthProvider.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';

interface Environment {
	id: string;
	key: string;
	name: string;
	description?: string;
	organization_id?: string;
	project_id?: string;
	created_at?: string;
	updated_at?: string;
	[key: string]: unknown;
}

interface SelectItem {
	label: string;
	value: string;
}

type DeleteComponentProps = {
	environmentId?: string;
	force?: boolean;
};

export default function DeleteComponent({
	environmentId,
	force = false,
}: DeleteComponentProps): React.ReactNode {
	const { scope } = useAuth();
	const { getEnvironments, getEnvironment, deleteEnvironment } =
		useEnvironmentApi();

	const [step, setState] = useState<
		| 'loading_environments'
		| 'environment_select'
		| 'confirmation'
		| 'deleting'
		| 'done'
		| 'error'
	>(
		environmentId
			? force
				? 'deleting'
				: 'confirmation'
			: 'loading_environments',
	);

	const [environments, setEnvironments] = useState<Environment[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [selectedEnvironment, setSelectedEnvironment] =
		useState<Environment | null>(null);
	const [confirmation, setConfirmation] = useState<string>('');

	// Load environments or specific environment
	useEffect(() => {
		const fetchEnvironment = async () => {
			try {
				if (environmentId) {
					// Get specific environment
					const result = await getEnvironment(
						scope.project_id || '',
						environmentId,
						undefined,
						null,
					);

					if (result.error) {
						setError(`Failed to fetch environment: ${result.error}`);
						setState('error');
						return;
					}

					setSelectedEnvironment(result.data as unknown as Environment);

					if (force) {
						setState('deleting');
					} else {
						setState('confirmation');
					}
				} else {
					// Get all environments
					const result = await getEnvironments(
						scope.project_id || '',
						undefined,
						null,
					);

					if (result.error) {
						setError(`Failed to fetch environments: ${result.error}`);
						setState('error');
						return;
					}

					const environmentsData = result.data || [];
					if (environmentsData.length === 0) {
						setError('No environments found in the selected project.');
						setState('error');
						return;
					}

					setEnvironments(environmentsData as unknown as Environment[]);
					setState('environment_select');
				}
			} catch (err) {
				setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
				setState('error');
			}
		};

		if (step === 'loading_environments') {
			fetchEnvironment();
		}
	}, [
		environmentId,
		force,
		getEnvironment,
		getEnvironments,
		step,
		scope.project_id,
	]);

	// Environment selection handler
	const handleEnvironmentSelect = useCallback(
		(item: SelectItem) => {
			const environment = environments.find(e => e.id === item.value);
			if (environment) {
				setSelectedEnvironment(environment);
				if (force) {
					setState('deleting');
				} else {
					setState('confirmation');
				}
			}
		},
		[environments, force],
	);

	// Handle confirmation submission
	const handleConfirmationSubmit = useCallback((value: string) => {
		if (value.toLowerCase() === 'delete') {
			setState('deleting');
		} else {
			setError('Deletion cancelled. Type "delete" to confirm.');
			setState('error');
		}
	}, []);

	// Delete the environment
	useEffect(() => {
		const remove = async () => {
			if (!selectedEnvironment) {
				setError('No environment selected');
				setState('error');
				return;
			}

			try {
				const result = await deleteEnvironment(
					scope.project_id || '',
					selectedEnvironment.id,
					undefined,
					null,
				);

				if (!result.error) {
					setState('done');
					setTimeout(() => process.exit(0), 500);
				} else {
					setError(`Failed to delete environment: ${result.error}`);
					setState('error');
				}
			} catch (err) {
				// For delete operations, a "Unexpected end of JSON input" error usually means
				// the server returned a 204 No Content response, which is actually a success
				if (
					err instanceof Error &&
					err.message.includes('Unexpected end of JSON input')
				) {
					setState('done');
					setTimeout(() => process.exit(0), 500);
				} else {
					setError(
						`Error: ${err instanceof Error ? err.message : String(err)}`,
					);
					setState('error');
				}
			}
		};

		if (step === 'deleting') {
			remove();
		}
	}, [deleteEnvironment, selectedEnvironment, step, scope.project_id]);

	if (step === 'loading_environments') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading environments...
				</Text>
			</Box>
		);
	}

	if (step === 'environment_select' && Array.isArray(environments)) {
		return (
			<Box flexDirection="column">
				<Text>Select an environment to delete:</Text>
				<SelectInputComponent
					items={environments.map(env => ({
						label: `${env.name} (${env.key})`,
						value: env.id,
					}))}
					onSelect={handleEnvironmentSelect}
				/>
			</Box>
		);
	}

	if (step === 'confirmation') {
		return (
			<Box flexDirection="column">
				<Text color="red">Warning: You are about to delete environment:</Text>
				<Text color="red">
					{selectedEnvironment?.name} ({selectedEnvironment?.key})
				</Text>
				<Text>This action cannot be undone. Type {'"delete"'} to confirm:</Text>
				<TextInput
					value={confirmation}
					onChange={setConfirmation}
					onSubmit={handleConfirmationSubmit}
				/>
			</Box>
		);
	}

	if (step === 'deleting') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Deleting environment...
				</Text>
			</Box>
		);
	}

	if (step === 'done') {
		return (
			<Box>
				<Text>✅ Environment successfully deleted!</Text>
			</Box>
		);
	}

	// Error state
	if (step === 'error') {
		// Exit after a short delay on error
		setTimeout(() => {
			process.exit(1);
		}, 500);

		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	return null;
}

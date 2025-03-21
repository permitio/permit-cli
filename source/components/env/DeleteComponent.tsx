import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInputComponent from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useAuth } from '../AuthProvider.js';
import { useProjectAPI } from '../../hooks/useProjectAPI.js';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';

interface Project {
	id: string;
	key: string;
	name: string;
}

interface Environment {
	id: string;
	key: string;
	name: string;
	description?: string;
}

interface SelectItem {
	label: string;
	value: string;
}

type DeleteComponentProps = {
	projectId?: string;
	environmentId?: string;
	force?: boolean;
};

export default function DeleteComponent({
	projectId,
	environmentId,
	force = false,
}: DeleteComponentProps): React.ReactNode {
	const { authToken } = useAuth();
	const cookie = null;
	const { getProjects } = useProjectAPI();
	const { getEnvironments, deleteEnvironment } = useEnvironmentApi();

	const [step, setStep] = useState<
		| 'loading_projects'
		| 'project_select'
		| 'loading_environments'
		| 'environment_select'
		| 'confirmation'
		| 'deleting'
		| 'done'
		| 'error'
	>('loading_projects');

	const [projects, setProjects] = useState<Project[]>([]);
	const [environments, setEnvironments] = useState<Environment[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [selectedEnvironment, setSelectedEnvironment] =
		useState<Environment | null>(null);
	const [confirmation, setConfirmation] = useState<string>('');

	// Load projects
	useEffect(() => {
		const fetchProjects = async () => {
			if (!authToken) {
				setError('No auth token available');
				setStep('error');
				return;
			}

			try {
				// Updated API call to use new structure with data property
				const result = await getProjects(authToken, cookie);

				if (result.error) {
					setError(`Failed to fetch projects: ${result.error}`);
					setStep('error');
					return;
				}

				// Ensure projects data exists and is an array
				const projectsData = result.data || [];

				if (!Array.isArray(projectsData)) {
					setError('Invalid projects data received from API');
					setStep('error');
					return;
				}

				if (projectsData.length === 0) {
					setError('No projects found.');
					setStep('error');
					return;
				}

				setProjects(projectsData);

				// If projectId is provided, select it directly
				if (projectId) {
					const project = projectsData.find(p => p.id === projectId);
					if (project) {
						setSelectedProject(project);
						setStep('loading_environments');
					} else {
						setError(`Project with ID ${projectId} not found`);
						setStep('project_select');
					}
				} else {
					setStep('project_select');
				}
			} catch (err) {
				setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
				setStep('error');
			}
		};

		if (step === 'loading_projects') {
			fetchProjects();
		}
	}, [authToken, cookie, getProjects, projectId, step]);

	// Load environments when project is selected
	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!selectedProject || !authToken) {
				setError('No project selected or auth token available');
				setStep('error');
				return;
			}

			try {
				// Updated API call to use new structure
				const result = await getEnvironments(
					selectedProject.id,
					authToken,
					cookie,
				);

				if (result.error) {
					setError(`Failed to fetch environments: ${result.error}`);
					setStep('error');
					return;
				}

				// Ensure environments data exists and is an array
				const environmentsData = result.data || [];

				if (!Array.isArray(environmentsData)) {
					setError('Invalid environments data received from API');
					setStep('error');
					return;
				}

				if (environmentsData.length === 0) {
					setError('No environments found in the selected project.');
					setStep('error');
					return;
				}

				setEnvironments(environmentsData);

				// If environmentId is provided, select it directly
				if (environmentId) {
					const environment = environmentsData.find(
						e => e.id === environmentId,
					);
					if (environment) {
						setSelectedEnvironment(environment);
						if (force) {
							setStep('deleting');
						} else {
							setStep('confirmation');
						}
					} else {
						setError(`Environment with ID ${environmentId} not found`);
						setStep('environment_select');
					}
				} else {
					setStep('environment_select');
				}
			} catch (err) {
				setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
				setStep('error');
			}
		};

		if (step === 'loading_environments' && selectedProject) {
			fetchEnvironments();
		}
	}, [
		authToken,
		cookie,
		environmentId,
		force,
		getEnvironments,
		selectedProject,
		step,
	]);

	// Project selection handler
	const handleProjectSelect = useCallback(
		(item: SelectItem) => {
			const project = projects.find(p => p.id === item.value);
			if (project) {
				setSelectedProject(project);
				setStep('loading_environments');
			}
		},
		[projects],
	);

	// Environment selection handler
	const handleEnvironmentSelect = useCallback(
		(item: SelectItem) => {
			const environment = environments.find(e => e.id === item.value);
			if (environment) {
				setSelectedEnvironment(environment);
				if (force) {
					setStep('deleting');
				} else {
					setStep('confirmation');
				}
			}
		},
		[environments, force],
	);

	// Handle confirmation submission
	const handleConfirmationSubmit = useCallback((value: string) => {
		if (value.toLowerCase() === 'delete') {
			setStep('deleting');
		} else {
			setError('Deletion cancelled. Type "delete" to confirm.');
			setStep('error');
		}
	}, []);

	// Delete the environment
	useEffect(() => {
		const remove = async () => {
			if (!selectedProject || !selectedEnvironment || !authToken) {
				setError('Missing project, environment, or authentication');
				setStep('error');
				return;
			}

			try {
				const result = await deleteEnvironment(
					selectedProject.id,
					selectedEnvironment.id,
					authToken,
					cookie,
				);

				// If no error, consider it successful
				if (!result.error) {
					setStep('done');

					// Add a short delay before exiting to ensure the output is visible
					setTimeout(() => {
						process.exit(0);
					}, 500);
				} else {
					setError(`Failed to delete environment: ${result.error}`);
					setStep('error');
				}
			} catch (err) {
				// For delete operations I noticed From  the permit log, a "Unexpected end of JSON input" error usually means
				// the server returned a 204 No Content response, which is actually a success
				if (
					err instanceof Error &&
					err.message.includes('Unexpected end of JSON input')
				) {
					// This is actually a successful deletion (204 response)
					setStep('done');

					// Add a short delay before exiting to ensure the output is visible
					setTimeout(() => {
						process.exit(0);
					}, 500);
				} else {
					setError(
						`Error: ${err instanceof Error ? err.message : String(err)}`,
					);
					setStep('error');
				}
			}
		};

		if (step === 'deleting') {
			remove();
		}
	}, [
		step,
		selectedProject,
		selectedEnvironment,
		authToken,
		cookie,
		deleteEnvironment,
	]);

	if (step === 'loading_projects' || step === 'loading_environments') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading{' '}
					{step === 'loading_projects' ? 'projects' : 'environments'}...
				</Text>
			</Box>
		);
	}

	if (step === 'project_select' && Array.isArray(projects)) {
		return (
			<Box flexDirection="column">
				<Text>Select a project:</Text>
				<SelectInputComponent
					items={projects.map(project => ({
						label: `${project.name} (${project.key})`,
						value: project.id,
					}))}
					onSelect={handleProjectSelect}
				/>
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

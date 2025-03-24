import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import zod from 'zod';
import { option } from 'pastel';
import { useAuth } from '../components/AuthProvider.js';
import { ActiveState } from './EnvironmentSelection.js';
import { useProjectAPI } from '../hooks/useProjectAPI.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';
import { useGraphDataApi } from '../hooks/useGraphDataApi.js';
import { saveHTMLGraph } from './HtmlGraphSaver.js';

export const options = zod.object({
	apiKey: zod
		.string()
		.optional()
		.describe(
			option({
				description: 'The API key for the Permit env, project or Workspace',
			}),
		),
});

type Props = {
	options: zod.infer<typeof options>;
};

export default function Graph({ options }: Props) {
	const {
		authToken: contextAuthToken,
		loading: authLoading,
		error: authError,
	} = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [state, setState] = useState<'project' | 'environment' | 'graph'>(
		'project',
	);
	const [projects, setProjects] = useState<ActiveState[]>([]);
	const [environments, setEnvironments] = useState<ActiveState[]>([]);
	const [selectedProject, setSelectedProject] = useState<ActiveState | null>(
		null,
	);
	const [selectedEnvironment, setSelectedEnvironment] =
		useState<ActiveState | null>(null);
	const [noData, setNoData] = useState(false);

	const { getProjects } = useProjectAPI();
	const { getEnvironments } = useEnvironmentApi();
	const { fetchGraphData } = useGraphDataApi();

	// Resolve the authToken on mount
	useEffect(() => {
		const token = contextAuthToken || options.apiKey || null;
		if (!token) {
			setError('No auth token found. Please log in or provide an API key.');
		} else {
			setAuthToken(token);
		}
	}, [contextAuthToken, options.apiKey]);

	// Fetch projects
	useEffect(() => {
		const fetchProjects = async () => {
			if (!authToken) return;

			try {
				setLoading(true);
				const { data: projects, error } = await getProjects(authToken);
				if (error) {
					setError('Failed to fetch projects.');
					setLoading(false);
					return;
				}
				const mappedProjects: ActiveState[] = projects
					? projects.map((project: { name: string; id: string }) => ({
							label: project.name,
							value: project.id,
						}))
					: [];
				setProjects(mappedProjects);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching projects:', err);
				setError('Failed to fetch projects.');
				setLoading(false);
			}
		};

		if (state === 'project') {
			fetchProjects();
		}
	}, [state, authToken, getProjects]);

	// Fetch environments
	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!authToken || !selectedProject) return;

			try {
				setLoading(true);
				const { data: environments, error } = await getEnvironments(
					selectedProject.value,
				);
				if (error) {
					setError('Failed to fetch environments.');
					setLoading(false);
					return;
				}
				const mappedEnvironments: ActiveState[] = environments
					? environments.map((env: { name: string; id: string }) => ({
							label: env.name,
							value: env.id,
						}))
					: [];
				setEnvironments(mappedEnvironments);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching environments:', err);
				setError('Failed to fetch environments.');
				setLoading(false);
			}
		};

		if (state === 'environment') {
			fetchEnvironments();
		}
	}, [state, authToken, selectedProject, getEnvironments]);

	// Fetch graph data
	useEffect(() => {
		const fetchData = async () => {
			if (!authToken || !selectedProject || !selectedEnvironment) return;

			try {
				setLoading(true);
				const { data: graphData, error } = await fetchGraphData(
					selectedProject.value,
					selectedEnvironment.value,
				);
				if (error) {
					setError('Failed to fetch data. Check network or auth token.');
					setLoading(false);
					return;
				}

				if (!graphData || graphData.nodes.length === 0) {
					setNoData(true);
					setLoading(false);
					return;
				}

				saveHTMLGraph(graphData);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching graph data:', err);
				setError('Failed to fetch data. Check network or auth token.');
				setLoading(false);
			}
		};

		if (state === 'graph') {
			fetchData();
		}
	}, [state, authToken, selectedProject, selectedEnvironment, fetchGraphData]);

	// Loading and error states
	if (authLoading || loading) {
		return (
			<Text>
				<Spinner type="dots" />{' '}
				{authLoading ? 'Authenticating...' : 'Loading Permit Graph...'}
			</Text>
		);
	}

	if (authError || error) {
		return <Text color="red">{authError || error}</Text>;
	}

	// If no graph data is present, show a specific message
	if (noData) {
		return <Text>Environment does not contain any data</Text>;
	}

	// State rendering
	if (state === 'project' && projects.length > 0) {
		return (
			<>
				<Text>Select a project</Text>
				<SelectInput
					items={projects}
					onSelect={project => {
						setSelectedProject(project as ActiveState);
						setState('environment');
					}}
				/>
			</>
		);
	}

	if (state === 'environment' && environments.length > 0) {
		return (
			<>
				<Text>Select an environment</Text>
				<SelectInput
					items={environments}
					onSelect={environment => {
						setSelectedEnvironment(environment as ActiveState);
						setState('graph');
					}}
				/>
			</>
		);
	}

	if (state === 'graph') {
		return <Text>Graph generated successfully and saved as HTML!</Text>;
	}

	return <Text>Initializing...</Text>;
}

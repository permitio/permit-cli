import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { apiCall } from '../lib/api.js';
import { saveHTMLGraph } from '../components/HtmlGraphSaver.js';
import { generateGraphData } from '../components/generateGraphData.js';
import zod from 'zod';
import { option } from 'pastel';
import { useAuth } from '../components/AuthProvider.js'; // Import useAuth

// Define types
type Relationship = {
	label: string;
	value: string;
	id: string;
	subjectvalue: string;
	value1: string;
};

type RoleAssignment = {
	user: string;
	role: string;
	resourceInstance: string;
};

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
	const [authToken, setAuthToken] = useState<string | null>(null); // Store resolved authToken
	const [state, setState] = useState<'project' | 'environment' | 'graph'>(
		'project',
	);
	const [projects, setProjects] = useState<[]>([]);
	const [environments, setEnvironments] = useState<[]>([]);
	const [selectedProject, setSelectedProject] = useState<any | null>(null);
	const [selectedEnvironment, setSelectedEnvironment] = useState<any | null>(
		null,
	);

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
				const { response: projects } = await apiCall('v2/projects', authToken);
				setProjects(
					projects['map']((project: any) => ({
						label: project.name,
						value: project.id,
					})),
				);
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
	}, [state, authToken]);

	// Fetch environments
	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!authToken || !selectedProject) return;

			try {
				setLoading(true);
				const { response: environments } = await apiCall(
					`v2/projects/${selectedProject.value}/envs`,
					authToken,
				);
				setEnvironments(
					environments['map']((env: any) => ({
						label: env.name,
						value: env.id,
					})),
				);
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
	}, [state, authToken, selectedProject]);

	// Fetch graph data
	useEffect(() => {
		const fetchData = async () => {
			if (!authToken || !selectedProject || !selectedEnvironment) return;

			try {
				setLoading(true);

				const Page = 1; // Fetches the one page per page
				const per_Page = 100; // api limit for 100 records per page

				const resourceResponse = await apiCall(
					`v2/facts/${selectedProject.value}/${selectedEnvironment.value}/resource_instances?detailed=true&page=${Page}&per_page=${per_Page}`,
					authToken,
				);

				const resourcesData = resourceResponse.response['map']((res: any) => ({
					label: `${res.resource}#${res.resource_id}`,
					value: res.id,
					id: res.id,
					id2: `${res.resource}:${res.key}`,
					key: res.key,
				}));

				// Create a lookup map for id2 to resource labels
				const id2ToLabelMap = new Map<string, string>();
				resourcesData.forEach((resource: { id2: string; id: string }) => {
					id2ToLabelMap.set(resource.id2, resource.id);
				});

				const relationsMap = new Map<string, Relationship[]>();

				resourceResponse.response['forEach']((resource: any) => {
					const relationsData = resource.relationships || [];
					relationsMap.set(
						resource.id,
						relationsData.map((relation: any) => {
							// Check if relation.object matches any id2
							const matchedLabel = id2ToLabelMap.get(relation.object);
							const matchedsubjectid = id2ToLabelMap.get(relation.subject);

							// Convert relation.relation to uppercase
							const relationLabel = relation.relation
								? relation.relation.toUpperCase()
								: 'UNKNOWN RELATION';

							return {
								label: relationLabel,
								value: matchedLabel || relation.object,
								value1: relation.object,
								subjectvalue: matchedsubjectid || resource.id,
								id: resource.id,
							};
						}),
					);
				});

				const roleAssignmentsData: RoleAssignment[] = [];

				const roleResponse = await apiCall(
					`v2/facts/${selectedProject.value}/${selectedEnvironment.value}/users?include_resource_instance_roles=true&page=${Page}&per_page=${per_Page}`,
					authToken,
				);

				const users = roleResponse.response?.data || [];

				users.forEach((user: any) => {
					const usernames = user.first_name + ' ' + user.last_name;

					// Check if the user has associated tenants
					if (user.associated_tenants?.length) {
						user.associated_tenants.forEach((tenant: any) => {
							if (tenant.resource_instance_roles?.length) {
								tenant.resource_instance_roles.forEach(
									(resourceInstanceRole: any) => {
										const resourceInstanceId =
											id2ToLabelMap.get(
												`${resourceInstanceRole.resource}:${resourceInstanceRole.resource_instance}`,
											) || resourceInstanceRole.resource_instance;

										roleAssignmentsData.push({
											user: usernames || 'Unknown User',
											role: resourceInstanceRole.role || 'Unknown Role',
											resourceInstance:
												resourceInstanceId || 'Unknown Resource Instance',
										});
									},
								);
							} else {
								// Push default entry for users with no roles in the tenant
								roleAssignmentsData.push({
									user: usernames || 'Unknown User',
									role: 'No Role Assigned',
									resourceInstance: 'No Resource Instance',
								});
							}
						});
					} else {
						// Push default entry for users with no associated tenants
						roleAssignmentsData.push({
							user: usernames || 'Unknown User',
							role: 'No Role Assigned',
							resourceInstance: 'No Resource Instance',
						});
					}
				});

				const graphData = generateGraphData(
					resourcesData,
					relationsMap,
					roleAssignmentsData,
				);
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
	}, [state, authToken, selectedProject, selectedEnvironment]);

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

	// State rendering
	if (state === 'project' && projects.length > 0) {
		return (
			<>
				<Text>Select a project</Text>
				<SelectInput
					items={projects}
					onSelect={project => {
						setSelectedProject(project);
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
						setSelectedEnvironment(environment);
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
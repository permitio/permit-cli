// import { Text } from 'ink';
// import React, { useCallback, useEffect, useState } from 'react';
// import Spinner from 'ink-spinner';
// import SelectInput from 'ink-select-input';
// import useAuth, { TokenType } from '../hooks/useAuth.js';
// import { apiCall } from '../lib/api.js';
// import WorkspaceSelector from './WorkspaceSelector.js';
// // Import { apiCall } from '../lib/api.js';

// type EnvSelectionProps = {
// 	readonly workspace: string;
// 	readonly project: string;
// 	readonly environment: string;
// 	readonly onEnvSelected: (
// 		workspace: Item<string> | undefined,
// 		project: Item<string> | undefined,
// 		environment: Item<string> | undefined,
// 	) => void;
// 	readonly onError: (error: string) => void;
// };

// export default function EnvSelectionWizard({
// 	workspace,
// 	project,
// 	environment,
// 	onEnvSelected,
// 	onError,
// }: EnvSelectionProps) {
// 	const {
// 		authToken,
// 		authCookie,
// 		loadingAuth,
// 		type,
// 		saveAuthTokens,
// 		reloadTokens,
// 	} = useAuth();
// 	const [activeWorkspace, setActiveWorkspace] = useState<
// 		Item<string> | undefined
// 	>();
// 	const [activeProject, setActiveProject] = useState<
// 		Item<string> | undefined
// 	>();
// 	const [activeEnvironment, setActiveEnvironment] = useState<
// 		Item<string> | undefined
// 	>();
// 	const [state, setState] = useState<
// 		'workspace' | 'project' | 'environment' | 'selected'
// 	>('workspace');
// 	const [workspaces, setWorkspaces] = useState<Array<Item<string>>>([]);
// 	const [projects, setProjects] = useState<Array<Item<string>>>([]);
// 	const [environments, setEnvironments] = useState<Array<Item<string>>>([]);

// 	const handleEnvironmentSelection = useCallback(
// 		(env: Item<string>) => {
// 			setActiveEnvironment(env);
// 			setState('selected');
// 			onEnvSelected(activeWorkspace, activeProject, activeEnvironment);
// 		},
// 		[onEnvSelected, activeEnvironment, activeProject, activeWorkspace],
// 	);

// 	const fetchEnvironments = useCallback(async () => {
// 		if (!authToken) {
// 			return;
// 		}

// 		const { response: items, status } = await apiCall(
// 			`v2/projects/${activeProject?.value}/envs`,
// 			authToken ?? '',
// 			authCookie,
// 		);

// 		const environments: Array<Item<string>> = items.map((w: any) => ({
// 			label: w.name,
// 			value: w.id,
// 		}));

// 		if (status === 200) {
// 			if (environments.length === 1 && environments[0]) {
// 				handleEnvironmentSelection(environments[0]);
// 			} else if (environment) {
// 				const selectedEnvironment = environments.find(
// 					(w: any) => w.id === environments,
// 				);
// 				if (selectedEnvironment) {
// 					handleEnvironmentSelection(selectedEnvironment);
// 				}
// 			}

// 			setEnvironments(environments);
// 		} else {
// 			onError('Failed to fetch organizations');
// 		}
// 	}, [
// 		activeProject?.value,
// 		authCookie,
// 		authToken,
// 		environment,
// 		handleEnvironmentSelection,
// 		onError,
// 	]);

// 	const handleProjectSelection = useCallback(
// 		async (p: Item<string>) => {
// 			setActiveProject(p);
// 			setState('environment');
// 			await fetchEnvironments();
// 		},
// 		[fetchEnvironments],
// 	);

// 	const fetchProjects = useCallback(async () => {
// 		const { response: items, status } = await apiCall(
// 			`v2/projects`,
// 			authToken ?? '',
// 			authCookie,
// 		);

// 		const projects: Array<Item<string>> = items.map((w: any) => ({
// 			label: w.name,
// 			value: w.id,
// 		}));

// 		if (status === 200) {
// 			if (projects.length === 1 && projects[0]) {
// 				handleProjectSelection(projects[0]);
// 			} else if (project) {
// 				const selectedProject = projects.find((w: any) => w.id === projects);
// 				if (selectedProject) {
// 					handleProjectSelection(selectedProject);
// 				}
// 			}

// 			setProjects(projects);
// 		} else {
// 			onError('Failed to fetch projects');
// 		}
// 	}, [authCookie, authToken, handleProjectSelection, onError, project]);

// 	const handleWorkspaceSelection = useCallback(
// 		async (ws: Item<string>) => {
// 			if (type === TokenType.AccessToken) {
// 				try {
// 					const { headers } = await apiCall(
// 						`auth/switch_org/${ws.value}`,
// 						authToken ?? '',
// 						authCookie,
// 						'POST',
// 					);
// 					await saveAuthTokens(authToken ?? '', headers.getSetCookie()[0]);
// 				} catch (error) {
// 					console.log(error);
// 				}
// 			}

// 			setActiveWorkspace(ws);
// 			setState('project');
// 			await fetchProjects();
// 		},
// 		[authCookie, authToken, saveAuthTokens, type, fetchProjects],
// 	);

// 	useEffect(() => {
// 		console.log(loadingAuth, authToken);
// 		if (workspace.length === 0) {
// 			reloadTokens();
// 		}

// 		if (!loadingAuth && workspaces?.length === 0) {
// 			fetchWorkspaces();
// 		}
// 	}, [fetchWorkspaces, loadingAuth, workspaces, reloadTokens]);

// 	return (
// 		<>
// 			{state === 'workspace' && <WorkspaceSelector />}
// 			{state === 'project' && activeWorkspace &&
// 				(projects && projects.length > 0 ? (
// 					<>
// 						<Text>Select a project</Text>
// 						<SelectInput items={projects} onSelect={handleProjectSelection} />
// 					</>
// 				) : (
// 					<Text>
// 						<Spinner type="dots" /> Loading Projects
// 					</Text>
// 				))}
// 			{state === 'environment' && activeEnvironment &&
// 				(environments && environments.length > 0 ? (
// 					<>
// 						<Text>Select an environment</Text>
// 						<SelectInput
// 							items={environments}
// 							onSelect={handleEnvironmentSelection}
// 						/>
// 					</>
// 				) : (
// 					<Text>
// 						<Spinner type="dots" /> Loading Environments
// 					</Text>
// 				))}
// 			{state === 'selected' && (
// 				<Text color="green">
// 					Selected Environment: {activeEnvironment?.label}
// 				</Text>
// 			)}
// 		</>
// 	);
// }

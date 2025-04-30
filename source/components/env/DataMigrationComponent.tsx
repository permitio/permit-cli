import React, { useState, useEffect, useCallback } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { useEnvironmentApi } from '../../hooks/useEnvironmentApi.js';
import { useProjectAPI } from '../../hooks/useProjectAPI.js';
import { useAuth } from '../AuthProvider.js';
import { ActiveState } from '../EnvironmentSelection.js';
import { useDataMigration } from '../../hooks/useDataMigration.js';

type Props = {
	source?: string;
	target?: string;
	skipResources?: boolean;
	skipUsers?: boolean;
	conflictStrategy?: 'override' | 'fail';
	onComplete?: () => void;
};

const DataMigrationComponent: React.FC<Props> = ({
	source,
	target,
	conflictStrategy = 'override',
	onComplete,
}) => {
	const { scope } = useAuth();
	const { getEnvironments } = useEnvironmentApi();
	const { getProjects } = useProjectAPI();

	const [sourceEnv, setSourceEnv] = useState<string | null>(source || null);
	const [targetEnv, setTargetEnv] = useState<string | null>(target || null);
	const [environments, setEnvironments] = useState<ActiveState[]>([]);
	const [projects, setProjects] = useState<ActiveState[]>([]);
	const [activeProject, setActiveProject] = useState<string | null>(null);
	const [state, setState] = useState<
		| 'loading'
		| 'select-project'
		| 'select-source'
		| 'select-target'
		| 'migrating'
		| 'done'
		| 'error'
	>('loading');
	const [error, setError] = useState<string | null>(null);
	const [migrationStats, setMigrationStats] = useState<{
		users: { total: number; success: number; failed: number };
		roleAssignments: { total: number; success: number; failed: number };
	} | null>(null);

	const { migrateUsers, migrateRoleAssignments } = useDataMigration();

	// When migration is done and stats are set, call the onComplete callback and exit the process
	useEffect(() => {
		if (state === 'done' && migrationStats) {
			// Print final summary to console for debug
			console.log('Migration completed. Final results:');
			console.log(
				`Users: ${migrationStats.users?.success || 0}/${migrationStats.users?.total || 0}`,
			);
			console.log(
				`Role Assignments: ${migrationStats.roleAssignments?.success || 0}/${migrationStats.roleAssignments?.total || 0}`,
			);

			if (onComplete) {
				onComplete();
			} else {
				// Ensure we exit after showing the completion message for 2 seconds
				setTimeout(() => {
					console.log('Exiting process...');
					process.exit(0);
				}, 2000);
			}
		} else if (state === 'error') {
			// Exit with error code after a short delay
			setTimeout(() => {
				console.log('Exiting with error...');
				process.exit(1);
			}, 2000);
		}
	}, [state, migrationStats, onComplete]);

	// Load projects if needed
	useEffect(() => {
		const fetchProjects = async () => {
			// If project_id is already in scope, use it directly
			if (scope.project_id) {
				setActiveProject(scope.project_id);
				setState('select-source');
				return;
			}

			try {
				const { data: projectsData, error: projectsError } =
					await getProjects();

				if (projectsError) {
					setError(`Failed to load projects: ${projectsError}`);
					setState('error');
					return;
				}

				if (!projectsData || projectsData.length === 0) {
					setError('No projects found');
					setState('error');
					return;
				}

				if (projectsData.length === 1 && projectsData[0]) {
					setActiveProject(projectsData[0].id);
					setState('select-source');
				} else {
					setProjects(
						projectsData.map(project => ({
							label: project.name,
							value: project.id,
						})),
					);
					setState('select-project');
				}
			} catch (err) {
				setError(
					'Error loading projects: ' +
						(err instanceof Error ? err.message : 'Unknown error'),
				);
				setState('error');
			}
		};

		fetchProjects();
	}, [getProjects, scope.project_id]);

	// Load environments
	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!activeProject) return;

			try {
				const { data: environmentsData, error: environmentsError } =
					await getEnvironments(activeProject);

				if (environmentsError) {
					setError(`Failed to load environments: ${environmentsError}`);
					setState('error');
					return;
				}

				if (!environmentsData || environmentsData.length < 2) {
					setError('You need at least two environments to perform migration');
					setState('error');
					return;
				}

				setEnvironments(
					environmentsData.map(env => ({
						label: env.name,
						value: env.id,
					})),
				);

				// If source is provided and valid, select it
				if (source) {
					const sourceEnvironment = environmentsData.find(
						env => env.id === source || env.key === source,
					);

					if (sourceEnvironment) {
						setSourceEnv(sourceEnvironment.id);
						setState('select-target');
					} else if (state === 'loading') {
						setState('select-source');
					}
				} else if (state === 'loading') {
					setState('select-source');
				}

				// If target is provided and valid, select it
				if (target && sourceEnv) {
					const targetEnvironment = environmentsData.find(
						env => env.id === target || env.key === target,
					);

					if (targetEnvironment && targetEnvironment.id !== sourceEnv) {
						setTargetEnv(targetEnvironment.id);
						setState('migrating');
					}
				}
			} catch (err) {
				setError(
					'Error loading environments: ' +
						(err instanceof Error ? err.message : 'Unknown error'),
				);
				setState('error');
			}
		};

		if (activeProject && (state === 'select-source' || state === 'loading')) {
			fetchEnvironments();
		}
	}, [activeProject, getEnvironments, source, state, target, sourceEnv]);

	// Perform migration
	useEffect(() => {
		const performMigration = async () => {
			if (sourceEnv && targetEnv && state === 'migrating') {
				try {
					let userStats = { total: 0, success: 0, failed: 0 };
					let roleAssignmentStats = { total: 0, success: 0, failed: 0 };

					console.log(`DEBUG - Using project ID: ${scope.project_id}`);
					console.log(
						`DEBUG - Source env: ${sourceEnv}, Target env: ${targetEnv}`,
					);

					// Migrate users first (these are required for role assignments)
					try {
						console.log('Migrating users...');
						userStats = await migrateUsers(
							sourceEnv,
							targetEnv,
							conflictStrategy,
						);

						// Add a small delay to ensure users are completely processed
						console.log('Waiting for user data to settle...');
						await new Promise(resolve => setTimeout(resolve, 1000));
					} catch (userError) {
						console.error(
							'Error during user migration:',
							userError instanceof Error ? userError.message : 'Unknown error',
						);
					}

					// Migrate role assignments
					try {
						console.log('Migrating role assignments...');
						roleAssignmentStats = await migrateRoleAssignments(
							sourceEnv,
							targetEnv,
							conflictStrategy,
						);
					} catch (assignmentError) {
						console.error(
							'Error during role assignment migration:',
							assignmentError instanceof Error
								? assignmentError.message
								: 'Unknown error',
						);
					}

					setMigrationStats({
						users: userStats,
						roleAssignments: roleAssignmentStats,
					});

					setState('done');
				} catch (err) {
					setError(
						'Migration failed: ' +
							(err instanceof Error ? err.message : 'Unknown error'),
					);
					setState('error');
				}
			}
		};

		performMigration();
	}, [
		sourceEnv,
		targetEnv,
		state,
		migrateUsers,
		migrateRoleAssignments,
		conflictStrategy,
		scope.project_id,
	]);

	const handleProjectSelect = useCallback((item: { value: string }) => {
		setActiveProject(item.value);
		setState('select-source');
	}, []);

	const handleSourceSelect = useCallback((item: { value: string }) => {
		setSourceEnv(item.value);
		setState('select-target');
	}, []);

	const handleTargetSelect = useCallback(
		(item: { value: string }) => {
			// Make sure target is different from source
			if (item.value !== sourceEnv) {
				setTargetEnv(item.value);
				setState('migrating');
			} else {
				setError('Source and target environments cannot be the same');
			}
		},
		[sourceEnv],
	);

	return (
		<Box flexDirection="column">
			{state === 'loading' && (
				<Text>
					<Spinner type="dots" /> Loading...
				</Text>
			)}

			{state === 'select-project' && (
				<>
					<Text>Select project:</Text>
					<SelectInput items={projects} onSelect={handleProjectSelect} />
				</>
			)}

			{state === 'select-source' && (
				<>
					<Text>Select source environment:</Text>
					<SelectInput items={environments} onSelect={handleSourceSelect} />
				</>
			)}

			{state === 'select-target' && sourceEnv && (
				<>
					<Text>Select target environment:</Text>
					<SelectInput
						items={environments.filter(env => env.value !== sourceEnv)}
						onSelect={handleTargetSelect}
					/>
				</>
			)}

			{state === 'migrating' && (
				<Text>
					<Spinner type="dots" /> Migrating data from{' '}
					{environments.find(e => e.value === sourceEnv)?.label} to{' '}
					{environments.find(e => e.value === targetEnv)?.label}...
				</Text>
			)}

			{state === 'done' && migrationStats && (
				<>
					<Text>Migration completed successfully!</Text>
					<Box marginTop={1} flexDirection="column">
						<Text>Migration Summary:</Text>
						<Text>
							Users: {migrationStats.users?.success || 0}/
							{migrationStats.users?.total || 0} migrated successfully
						</Text>
						<Text>
							Role Assignments: {migrationStats.roleAssignments?.success || 0}/
							{migrationStats.roleAssignments?.total || 0} migrated successfully
						</Text>

						{/* Warning messages */}
						{(migrationStats.users?.failed || 0) > 0 && (
							<Text color="yellow">
								Warning: {migrationStats.users?.failed} users failed to migrate
							</Text>
						)}
						{(migrationStats.roleAssignments?.failed || 0) > 0 && (
							<Text color="yellow">
								Warning: {migrationStats.roleAssignments?.failed} role
								assignments failed to migrate
							</Text>
						)}
					</Box>
				</>
			)}

			{state === 'error' && error && (
				<>
					<Text color="red">Error: {error}</Text>
					<Text>Process will exit in a few seconds...</Text>
				</>
			)}
		</Box>
	);
};

export default DataMigrationComponent;

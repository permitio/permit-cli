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

const MIGRATION_STATE = {
	LOADING: 'loading',
	SELECT_PROJECT: 'select-project',
	SELECT_SOURCE: 'select-source',
	SELECT_TARGET: 'select-target',
	MIGRATING: 'migrating',
	DONE: 'done',
	ERROR: 'error',
} as const;

// Common UI labels and messages
const WARNING_TEXT = 'Warning:';
const UNKNOWN_ERROR = 'Unknown error';
const SAME_ENV_ERROR = 'Source and target environments cannot be the same';

type MigrationState = (typeof MIGRATION_STATE)[keyof typeof MIGRATION_STATE];

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
	const [state, setState] = useState<MigrationState>(MIGRATION_STATE.LOADING);
	const [error, setError] = useState<string | null>(null);
	const [migrationStats, setMigrationStats] = useState<{
		users: { total: number; success: number; failed: number };
		roleAssignments: { total: number; success: number; failed: number };
	} | null>(null);

	const { migrateUsers, migrateRoleAssignments } = useDataMigration();

	// Handle completion & exit
	useEffect(() => {
		if (state === MIGRATION_STATE.DONE && migrationStats) {
			console.log('Migration completed. Final results:');
			console.log(
				`Users: ${migrationStats.users.success}/${migrationStats.users.total}`,
			);
			console.log(
				`Role Assignments: ${migrationStats.roleAssignments.success}/${migrationStats.roleAssignments.total}`,
			);
			if (onComplete) {
				onComplete();
			} else {
				setTimeout(() => {
					console.log('Exiting process...');
					process.exit(0);
				}, 2000);
			}
		}
		if (state === MIGRATION_STATE.ERROR) {
			setTimeout(() => {
				console.log('Exiting with error...');
				process.exit(1);
			}, 2000);
		}
	}, [state, migrationStats, onComplete]);

	// Load projects
	useEffect(() => {
		const fetchProjects = async () => {
			if (scope.project_id) {
				setActiveProject(scope.project_id);
				setState(MIGRATION_STATE.SELECT_SOURCE);
				return;
			}
			try {
				const { data: projectsData, error: projectsError } =
					await getProjects();
				if (projectsError) {
					setError(`Failed to load projects: ${projectsError}`);
					setState(MIGRATION_STATE.ERROR);
					return;
				}
				if (!projectsData || projectsData.length === 0) {
					setError('No projects found');
					setState(MIGRATION_STATE.ERROR);
					return;
				}
				if (projectsData.length === 1) {
					setActiveProject(projectsData[0]!.id);
					setState(MIGRATION_STATE.SELECT_SOURCE);
				} else {
					setProjects(projectsData.map(p => ({ label: p.name, value: p.id })));
					setState(MIGRATION_STATE.SELECT_PROJECT);
				}
			} catch (e) {
				setError(
					'Error loading projects: ' +
						(e instanceof Error ? e.message : UNKNOWN_ERROR),
				);
				setState(MIGRATION_STATE.ERROR);
			}
		};
		fetchProjects();
	}, [getProjects, scope.project_id]);

	// Load environments
	useEffect(() => {
		const fetchEnvironments = async () => {
			if (!activeProject) return;
			try {
				const { data: envData, error: envError } =
					await getEnvironments(activeProject);
				if (envError) {
					setError(`Failed to load environments: ${envError}`);
					setState(MIGRATION_STATE.ERROR);
					return;
				}
				if (!envData || envData.length < 2) {
					setError('You need at least two environments to perform migration');
					setState(MIGRATION_STATE.ERROR);
					return;
				}
				setEnvironments(
					envData.map(env => ({ label: env.name, value: env.id })),
				);
				if (source) {
					const found = envData.find(e => e.id === source || e.key === source);
					if (found) {
						setSourceEnv(found.id);
						setState(MIGRATION_STATE.SELECT_TARGET);
					} else if (state === MIGRATION_STATE.LOADING) {
						setState(MIGRATION_STATE.SELECT_SOURCE);
					}
				} else if (state === MIGRATION_STATE.LOADING) {
					setState(MIGRATION_STATE.SELECT_SOURCE);
				}
				if (target && sourceEnv) {
					const found = envData.find(e => e.id === target || e.key === target);
					if (found && found.id !== sourceEnv) {
						setTargetEnv(found.id);
						setState(MIGRATION_STATE.MIGRATING);
					}
				}
			} catch (e) {
				setError(
					'Error loading environments: ' +
						(e instanceof Error ? e.message : UNKNOWN_ERROR),
				);
				setState(MIGRATION_STATE.ERROR);
			}
		};
		if (
			activeProject &&
			(
				[
					MIGRATION_STATE.SELECT_SOURCE,
					MIGRATION_STATE.LOADING,
				] as MigrationState[]
			).includes(state)
		) {
			fetchEnvironments();
		}
	}, [activeProject, getEnvironments, source, state, target, sourceEnv]);

	// Perform migration
	useEffect(() => {
		const performMigration = async () => {
			if (state !== MIGRATION_STATE.MIGRATING || !sourceEnv || !targetEnv)
				return;
			try {
				console.log(`DEBUG - Using project ID: ${scope.project_id}`);
				console.log(
					`DEBUG - Source env: ${sourceEnv}, Target env: ${targetEnv}`,
				);
				let userStats = { total: 0, success: 0, failed: 0 };
				let assignmentStats = { total: 0, success: 0, failed: 0 };
				try {
					console.log('Migrating users...');
					userStats = await migrateUsers(
						sourceEnv,
						targetEnv,
						conflictStrategy,
					);
					console.log('Waiting for user data to settle...');
					await new Promise(r => setTimeout(r, 1000));
				} catch (uErr) {
					console.error(WARNING_TEXT, uErr);
				}
				try {
					console.log('Migrating role assignments...');
					assignmentStats = await migrateRoleAssignments(
						sourceEnv,
						targetEnv,
						conflictStrategy,
					);
				} catch (aErr) {
					console.error(WARNING_TEXT, aErr);
				}
				setMigrationStats({
					users: userStats,
					roleAssignments: assignmentStats,
				});
				setState(MIGRATION_STATE.DONE);
			} catch (e) {
				setError(
					'Migration failed: ' +
						(e instanceof Error ? e.message : UNKNOWN_ERROR),
				);
				setState(MIGRATION_STATE.ERROR);
			}
		};
		performMigration();
	}, [
		state,
		sourceEnv,
		targetEnv,
		migrateUsers,
		migrateRoleAssignments,
		conflictStrategy,
		scope.project_id,
	]);

	const handleProjectSelect = useCallback((item: { value: string }) => {
		setActiveProject(item.value);
		setState(MIGRATION_STATE.SELECT_SOURCE);
	}, []);

	const handleSourceSelect = useCallback((item: { value: string }) => {
		setSourceEnv(item.value);
		setState(MIGRATION_STATE.SELECT_TARGET);
	}, []);

	const handleTargetSelect = useCallback(
		(item: { value: string }) => {
			if (item.value === sourceEnv) {
				setError(`${WARNING_TEXT} ${SAME_ENV_ERROR}`);
			} else {
				setTargetEnv(item.value);
				setState(MIGRATION_STATE.MIGRATING);
			}
		},
		[sourceEnv],
	);

	return (
		<Box flexDirection="column">
			{state === MIGRATION_STATE.LOADING && (
				<Text>
					<Spinner type="dots" /> Loading...
				</Text>
			)}

			{state === MIGRATION_STATE.SELECT_PROJECT && (
				<>
					<Text>Select project:</Text>
					<SelectInput items={projects} onSelect={handleProjectSelect} />
				</>
			)}

			{state === MIGRATION_STATE.SELECT_SOURCE && (
				<>
					<Text>Select source environment:</Text>
					<SelectInput items={environments} onSelect={handleSourceSelect} />
				</>
			)}

			{state === MIGRATION_STATE.SELECT_TARGET && sourceEnv && (
				<>
					<Text>Select target environment:</Text>
					<SelectInput
						items={environments.filter(e => e.value !== sourceEnv)}
						onSelect={handleTargetSelect}
					/>
				</>
			)}

			{state === MIGRATION_STATE.MIGRATING && (
				<Text>
					<Spinner type="dots" /> Migrating data from{' '}
					{environments.find(e => e.value === sourceEnv)?.label} to{' '}
					{environments.find(e => e.value === targetEnv)?.label}...
				</Text>
			)}

			{state === MIGRATION_STATE.DONE && migrationStats && (
				<>
					<Text>Migration completed successfully!</Text>
					<Box marginTop={1} flexDirection="column">
						<Text>Migration Summary:</Text>
						<Text>
							Users: {migrationStats.users.success}/{migrationStats.users.total}{' '}
							migrated successfully
						</Text>
						<Text>
							Role Assignments: {migrationStats.roleAssignments.success}/
							{migrationStats.roleAssignments.total} migrated successfully
						</Text>
						{migrationStats.users.failed > 0 && (
							<Text color="yellow">
								{WARNING_TEXT} {migrationStats.users.failed} users failed to
								migrate
							</Text>
						)}
						{migrationStats.roleAssignments.failed > 0 && (
							<Text color="yellow">
								{WARNING_TEXT} {migrationStats.roleAssignments.failed} role
								assignments failed to migrate
							</Text>
						)}
					</Box>
				</>
			)}

			{state === MIGRATION_STATE.ERROR && error && (
				<>
					<Text color="red">Error: {error}</Text>
					<Text>Process will exit in a few seconds...</Text>
				</>
			)}
		</Box>
	);
};

export default DataMigrationComponent;

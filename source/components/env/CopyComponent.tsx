import React, { useCallback, useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { TextInput } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import {
	EnvironmentCopy,
	useEnvironmentApi,
} from '../../hooks/useEnvironmentApi.js';
import EnvironmentSelection, {
	ActiveState,
} from '../../components/EnvironmentSelection.js';
import { cleanKey } from '../../lib/env/copy/utils.js';
import { useAuth } from '../AuthProvider.js';
import useDataMigration from '../../hooks/useDataMigration.js';

// Define constants for state values to avoid duplication
const STATE_LOADING = 'loading';
const STATE_SELECTING_ENV = 'selecting-env';
const STATE_SELECTING_NAME = 'selecting-name';
const STATE_SELECTING_DESCRIPTION = 'selecting-description';
const STATE_COPYING = 'copying';
const STATE_MIGRATING_DATA = 'migrating-data';
const STATE_DONE = 'done';

type Props = {
	from?: string;
	name?: string;
	description?: string;
	to?: string;
	conflictStrategy?: 'fail' | 'overwrite';
	dataMigration?: boolean;
	skipResources?: boolean;
	skipUsers?: boolean;
};

interface EnvCopyBody {
	existingEnvId?: string | null;
	newEnvKey?: string | null;
	newEnvName?: string | null;
	newEnvDescription?: string | null;
	conflictStrategy?: string | null;
}

// Define a specific type for component state
type CopyComponentState =
	| typeof STATE_LOADING
	| typeof STATE_SELECTING_ENV
	| typeof STATE_SELECTING_NAME
	| typeof STATE_SELECTING_DESCRIPTION
	| typeof STATE_COPYING
	| typeof STATE_MIGRATING_DATA
	| typeof STATE_DONE;

// Define a type for response data
interface EnvironmentResponse {
	id?: string;
	key?: string;
	[key: string]: unknown;
}

export default function CopyComponent({
	from,
	to: envToId,
	name,
	description,
	conflictStrategy,
	dataMigration = false,
	skipResources = false,
	skipUsers = false,
}: Props) {
	const [error, setError] = React.useState<string | null>(null);
	const [authToken, setAuthToken] = React.useState<string | null>(null);
	const [state, setState] = useState<CopyComponentState>(STATE_LOADING);
	const [projectFrom, setProjectFrom] = useState<string | null | undefined>(
		null,
	);
	const [envToName, setEnvToName] = useState<string | undefined>(name);
	const [envFrom, setEnvFrom] = useState<string | undefined>(from);
	// Initialize with provided description - crucial to differentiate between undefined and empty string
	const [envToDescription, setEnvToDescription] = useState<string | undefined>(
		description,
	);
	const [targetEnvId, setTargetEnvId] = useState<string | null>(null);
	const [migrationStats, setMigrationStats] = useState<{
		users: { total: number; success: number; failed: number };
		roles: { total: number; success: number; failed: number };
		resources: { total: number; success: number; failed: number };
		roleAssignments: { total: number; success: number; failed: number };
	} | null>(null);

	const { copyEnvironment } = useEnvironmentApi();
	const auth = useAuth();
	const { migrateAllData } = useDataMigration();

	useEffect(() => {
		if (auth.error) {
			setError(auth.error);
			return;
		}
		if (!auth.loading) {
			setProjectFrom(auth.scope.project_id);
			setAuthToken(auth.authToken);
		}
	}, [auth]);

	useEffect(() => {
		if (error || state === STATE_DONE) {
			process.exit(1);
		}
	}, [error, state]);

	useEffect(() => {
		const handleEnvCopy = async (envCopyBody: EnvCopyBody) => {
			let body = {};
			if (envCopyBody.existingEnvId) {
				body = {
					target_env: { existing: envCopyBody.existingEnvId },
				};
			} else if (envCopyBody.newEnvKey && envCopyBody.newEnvName) {
				body = {
					target_env: {
						new: {
							key: cleanKey(envCopyBody.newEnvKey),
							name: envCopyBody.newEnvName,
							description: envCopyBody.newEnvDescription ?? '',
						},
					},
				};
			}
			if (conflictStrategy) {
				body = {
					...body,
					conflict_strategy: envCopyBody.conflictStrategy ?? 'fail',
				};
			}
			const { data, error } = await copyEnvironment(
				projectFrom ?? '',
				envFrom ?? '',
				body as EnvironmentCopy,
			);
			if (error) {
				setError(`Error while copying Environment: ${error}`);
				return;
			}

			// Store the target environment ID for data migration
			let newEnvId = envToId;
			if (!newEnvId && data) {
				// Cast data to the right type
				const envData = data as EnvironmentResponse;
				if ('id' in envData) {
					newEnvId = envData.id;
				} else if (envData.key) {
					newEnvId = envData.key;
				}
			}

			if (newEnvId) {
				setTargetEnvId(newEnvId);
			}

			if (dataMigration && newEnvId) {
				setState(STATE_MIGRATING_DATA);
			} else {
				setState(STATE_DONE);
			}
		};

		if (
			((envToName && conflictStrategy) || envToId) &&
			envFrom &&
			projectFrom &&
			authToken &&
			(envToDescription !== undefined || envToId)
		) {
			setState(STATE_COPYING);
			handleEnvCopy({
				newEnvKey: envToName,
				newEnvName: envToName,
				newEnvDescription: envToDescription ?? '',
				existingEnvId: envToId,
				conflictStrategy: conflictStrategy,
			});
		}
	}, [
		authToken,
		conflictStrategy,
		copyEnvironment,
		dataMigration,
		envFrom,
		envToDescription,
		envToId,
		envToName,
		projectFrom,
	]);

	// Handle data migration if needed
	useEffect(() => {
		const performDataMigration = async () => {
			if (state !== STATE_MIGRATING_DATA || !envFrom || !targetEnvId) {
				return;
			}

			try {
				console.log(
					`Starting data migration from ${envFrom} to ${targetEnvId}`,
				);

				
				const migrationConflictStrategy = dataMigration
					? 'overwrite'
					: conflictStrategy;

				const results = await migrateAllData(envFrom, targetEnvId, {
					skipUsers,
					skipResources,
					conflictStrategy: migrationConflictStrategy,
				});

				setMigrationStats(results);
				setState(STATE_DONE);
			} catch (err) {
				setError(
					`Data migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
				);
			}
		};

		performDataMigration();
	}, [
		state,
		envFrom,
		targetEnvId,
		migrateAllData,
		skipUsers,
		skipResources,
		conflictStrategy,
		dataMigration,
	]);

	const handleEnvFromSelection = useCallback(
		(
			_organisation_id: ActiveState,
			_project_id: ActiveState,
			environment_id: ActiveState,
		) => {
			setEnvFrom(environment_id.value);
		},
		[],
	);

	useEffect(() => {
		if (!envFrom) {
			setState(STATE_SELECTING_ENV);
		} else if (!envToName && !envToId) {
			setState(STATE_SELECTING_NAME);
		} else if (envToDescription === undefined && !envToId) {
			setState(STATE_SELECTING_DESCRIPTION);
		} else if (envToName && envFrom) {
			// If we have name and source env, and description is defined (even if empty), proceed
			setState(STATE_COPYING);
		}
	}, [envFrom, envToDescription, envToId, envToName, dataMigration]);

	return (
		<>
			{state === STATE_SELECTING_ENV && authToken && (
				<>
					<Text>Select an existing Environment to copy from.</Text>
					<EnvironmentSelection
						accessToken={authToken}
						cookie={''}
						onComplete={handleEnvFromSelection}
						onError={setError}
					/>
				</>
			)}
			{authToken && state === STATE_SELECTING_NAME && (
				<>
					<Text>Input the new Environment name to copy to.</Text>
					<TextInput
						onSubmit={name => {
							setEnvToName(name);
						}}
						placeholder={'Enter name here...'}
					/>
				</>
			)}
			{authToken && state === STATE_SELECTING_DESCRIPTION && (
				<>
					<Text>
						Input the new Environment Description (press Enter to skip).
					</Text>
					<TextInput
						onSubmit={description => {
							setEnvToDescription(description);
							setState(STATE_COPYING);
						}}
						placeholder={'Enter description here (optional)...'}
					/>
				</>
			)}

			{state === STATE_COPYING && (
				<Text>
					<Spinner type="dots" /> Copying environment...
				</Text>
			)}

			{state === STATE_MIGRATING_DATA && (
				<Text>
					<Spinner type="dots" /> Migrating data from source to target
					environment...
				</Text>
			)}

			{state === STATE_DONE && (
				<Box flexDirection="column">
					<Text>Environment copied successfully</Text>

					{migrationStats && (
						<>
							<Text>Data Migration Summary:</Text>
							<Box marginLeft={2} flexDirection="column">
								{!skipUsers && (
									<>
										<Text>
											Users: {migrationStats.users.success}/
											{migrationStats.users.total}
										</Text>
										<Text>
											Roles: {migrationStats.roles.success}/
											{migrationStats.roles.total}
										</Text>
										<Text>
											Role Assignments: {migrationStats.roleAssignments.success}
											/{migrationStats.roleAssignments.total}
										</Text>
									</>
								)}
								{!skipResources && (
									<Text>
										Resources: {migrationStats.resources.success}/
										{migrationStats.resources.total}
									</Text>
								)}
							</Box>
						</>
					)}
				</Box>
			)}

			{error && <Text>{error}</Text>}
		</>
	);
}

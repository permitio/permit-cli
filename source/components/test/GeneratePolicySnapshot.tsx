import React, { useEffect } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { useGeneratePolicySnapshot } from './hooks/usePolicySnapshot.js';

export type GeneratePolicySnapshotProps = {
	dryRun: boolean;
	models: string[];
	path?: string;
	isTestTenant?: boolean;
};

export function GeneratePolicySnapshot({
	dryRun,
	models,
	path,
}: GeneratePolicySnapshotProps) {
	const { state, error, roles, tenantId, finalConfig, dryUsers } =
		useGeneratePolicySnapshot({ dryRun, models, path });

	// Handle Error and lifecycle completion.
	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	return (
		<>
			{state === 'roles' && <Text>Getting all roles</Text>}
			{roles.length > 0 && <Text>Roles found: {roles.length}</Text>}
			{state === 'rbac-tenant' && <Text>Crating a new Tenant</Text>}
			{tenantId && <Text>Created a new test tenant: {tenantId}</Text>}
			{state === 'rbac-generate' && (
				<Text>
					Generating test data for you <Spinner type={'dots3'} />{' '}
				</Text>
			)}
			{dryRun && <Text>Dry run mode!</Text>}
			{state === 'done' && path && <Text>Config saved to {path}</Text>}
			{state === 'done' && !path && (
				<Text>
					{' '}
					{JSON.stringify(
						dryRun
							? { users: dryUsers, config: finalConfig }
							: { config: finalConfig },
					)}{' '}
				</Text>
			)}
			{error && <Text>{error}</Text>}
		</>
	);
}

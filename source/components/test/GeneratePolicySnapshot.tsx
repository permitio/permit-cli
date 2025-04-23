import React, { useEffect } from 'react';
import { Newline, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useGeneratePolicySnapshot } from './hooks/usePolicySnapshot.js';
import { CodeSampleComponent } from './code-samples/CodeSampleComponent.js';

export type GeneratePolicySnapshotProps = {
	dryRun: boolean;
	models: string[];
	path?: string;
	isTestTenant?: boolean;
	snippet?: 'jest' | 'pytest' | 'vitest';
	snippetPath?: string;
};

export function GeneratePolicySnapshot({
	dryRun,
	models,
	path,
	snippet,
}: GeneratePolicySnapshotProps) {
	const filePath = snippet && !path ? 'authz-test.json' : path;
	const { state, error, roles, tenantId, finalConfig, dryUsers } =
		useGeneratePolicySnapshot({ dryRun, models, path: filePath });

	// Handle Error and lifecycle completion.
	useEffect(() => {
		if (error || (state === 'done' && !snippet)) {
			setTimeout(() => {
				process.exit(1);
			}, 1000);
		}
	}, [error, snippet, state]);
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
			{state === 'done' && filePath && <Text>Config saved to {filePath}</Text>}
			{state === 'done' && !filePath && (
				<Text>
					{' '}
					{JSON.stringify(
						dryRun
							? { users: dryUsers, config: finalConfig }
							: { config: finalConfig },
					)}{' '}
				</Text>
			)}
			{state === 'done' && snippet && (
				<>
					<Newline />
					<CodeSampleComponent
						framework={snippet}
						configPath={filePath}
						pdpUrl={'http://localhost:7766'}
					/>
				</>
			)}
			{error && <Text>{error}</Text>}
		</>
	);
}

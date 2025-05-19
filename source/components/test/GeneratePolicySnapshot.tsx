import React, { useCallback, useEffect, useState } from 'react';
import { Newline, Text } from 'ink';
import {
	RBACConfig,
	useGeneratePolicyRBACSnapshot,
} from './hooks/usePolicyRBACSnapshot.js';
import { CodeSampleComponent } from './code-samples/CodeSampleComponent.js';
import {
	ABACConfig,
	useGeneratePolicyABACSnapshot,
} from './hooks/usePolicyABACSnapshot.js';
import { saveFile } from '../../utils/fileSaver.js';
import Spinner from 'ink-spinner';

export type GeneratePolicySnapshotProps = {
	dryRun: boolean;
	models: string[];
	path?: string;
	isTestTenant?: boolean;
	snippet?: 'jest' | 'pytest' | 'vitest';
	snippetPath?: string;
};

export type DryUser = {
	key: string;
	email: string;
	firstName: string;
	lastName: string;
	roles: string[];
};

export type AccessControlConfig = {
	config: (RBACConfig | ABACConfig)[];
	users?: DryUser[];
};

export function GeneratePolicySnapshot({
	dryRun,
	models,
	path,
	snippet,
	snippetPath,
}: GeneratePolicySnapshotProps) {
	const filePath = snippet && !path ? 'authz-test.json' : path;
	const [state, setState] = useState<'building' | 'done'>('building');
	const [error, setError] = useState<string | undefined | null>(undefined);
	const [finalConfig, setFinalConfig] = useState<AccessControlConfig>({
		config: [],
	});
	// const [finalDryUsers, setFinalDryUsers] = useState<DryUser[]>([]);
	const {
		state: RBACState,
		error: RBACError,
		finalConfig: RBACConfig,
		dryUsers: dryRBACUsers,
	} = useGeneratePolicyRBACSnapshot({
		dryRun,
		models,
		path: filePath,
	});

	const {
		state: ABACState,
		error: ABACError,
		finalConfig: ABACConfig,
		dryUsers: dryABACUsers,
	} = useGeneratePolicyABACSnapshot({
		dryRun,
		models,
		path,
	});

	const saveConfigToPath = useCallback(
		async (finalConfig: AccessControlConfig) => {
			// Write config as pretty JSON
			const json = JSON.stringify(finalConfig, null, 2);
			const { error } = await saveFile(path ?? '', json);
			if (error) {
				setError(error);
				return;
			}
			setTimeout(() => {
				setState('done');
			}, 1000);
		},
		[path],
	);

	useEffect(() => {
		// console.log('IM MAIN', [RBACState, ABACState], models);
		const configsGenerated = [RBACState, ABACState].filter(
			state => state === 'done',
		);
		if (configsGenerated.length === models.length) {
			const combinedConfigs: AccessControlConfig = {
				config: [...ABACConfig, ...RBACConfig],
				users: [...dryABACUsers, ...dryRBACUsers],
			};
			setFinalConfig(prev => ({
				...prev,
				...combinedConfigs,
			}));
			if (path) {
				saveConfigToPath(combinedConfigs);
			} else {
				setTimeout(() => {
					setState('done');
				}, 1000);
			}
		}
	}, [
		ABACConfig,
		ABACState,
		RBACConfig,
		RBACState,
		dryABACUsers,
		dryRBACUsers,
		models,
		path,
		saveConfigToPath,
	]);

	return (
		<>
			{state === 'building' && (
				<Text>
					Building Config <Spinner type={'dots'} />{' '}
				</Text>
			)}
			{state === 'done' && path && <Text>Config saved to {path}!</Text>}
			{state === 'done' && !path && (
				<Text> {JSON.stringify(finalConfig)} </Text>
			)}
			{state === 'done' && snippet && (
				<>
					<Newline />
					<CodeSampleComponent
						framework={snippet}
						configPath={filePath}
						pdpUrl={'http://localhost:7766'}
						path={snippetPath}
					/>
				</>
			)}
			{error && <Text>{error}</Text>}
			{ABACError && <Text>{ABACError}</Text>}
			{RBACError && <Text>{RBACError}</Text>}
		</>
	);
}

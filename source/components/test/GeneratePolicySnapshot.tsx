import React, { useCallback, useEffect, useState } from 'react';
import {
	RoleAssignmentCreate,
	RoleRead,
	useRolesApi,
} from '../../hooks/useRolesApi.js';
import { Text } from 'ink';
import {
	CreateTenantBody,
	CreateUserBody,
	useTenantApi,
} from '../../hooks/useTenantApi.js';
import randomName from '@scaleway/random-name';
import Spinner from 'ink-spinner';
import { ResourceRead, useResourcesApi } from '../../hooks/useResourcesApi.js';
import fs from 'node:fs/promises';
import * as pathModule from 'node:path';

type Props = {
	dryRun: boolean;
	models: string[];
	codeSample?: 'jest' | 'pytest';
	path?: string;
};

type RBACConfig = {
	user: string;
	action: string;
	resource: string;
	result: boolean;
};

type ABACUser = {
	key: string;
	attributes: {
		[key: string]: string;
	};
};

type ABACResource = {
	key: string;
	attributes: {
		[key: string]: string;
	};
};

type ABACConfig = {
	user: ABACUser;
	action: string;
	resource: ABACResource;
	result: boolean;
};

type ReBACConfig = {
	user: string;
	action: string;
	resource: string;
	result: boolean;
};

type AccessControlConfig = RBACConfig | ABACConfig | ReBACConfig;

export function GeneratePolicySnapshot({ dryRun, models, path }: Props) {
	const { getRoles, assignRoles } = useRolesApi();
	const { createTenant, createAndAddUsers } = useTenantApi();
	const { getResources } = useResourcesApi();

	const [roles, setRoles] = useState<RoleRead[]>([]);
	const [error, setError] = useState<null | string>(null);
	const [state, setState] = useState<
		'roles' | 'tenant' | 'generate' | 'resources' | 'done'
	>('roles');
	const [tenantId, setTenantId] = useState<string | undefined>(undefined);
	const [modelsGenerated, setModelsGenerated] = useState<number>(0);
	const [finalConfig, setFinalConfig] = useState<AccessControlConfig[]>([]);
	const [resources, setResources] = useState<ResourceRead[]>([]);

	const createUserAndAttachRoles = useCallback(
		async (
			usernames: string[],
			userRoleMappings: Record<string, RoleRead[]>,
		) => {
			for (const user of usernames) {
				const [firstName = '', lastName = ''] = user.split(' ');
				const body: CreateUserBody = {
					key: firstName + lastName,
					first_name: firstName,
					last_name: lastName,
					email: firstName + lastName + '@gmail.com',
					attributes: {},
				};
				const { error } = await createAndAddUsers(tenantId ?? '', body);

				if (error) {
					setError(error);
					return;
				}
				const assignBody: RoleAssignmentCreate[] =
					userRoleMappings[user]?.map(role => ({
						role: role.key,
						user: firstName + lastName,
						tenant: tenantId,
					})) ?? [];
				const { error: assignError } = await assignRoles(assignBody);
				if (assignError) {
					setError(assignError);
					return;
				}
			}
		},
		[assignRoles, createAndAddUsers, tenantId],
	);

	const fetchRoles = useCallback(async () => {
		let { data, error } = await getRoles();
		if (error || data === undefined) {
			setError(error);
			return;
		}
		data = data as RoleRead[];
		if (data.length === 0) {
			setError('Environment has no Roles present');
			return;
		}
		setRoles(data as RoleRead[]);
		setState('tenant');
	}, [getRoles]);

	const fetchResources = useCallback(async () => {
		const { data, error } = await getResources();
		if (error) {
			setError(error);
			return;
		}
		setResources(data as ResourceRead[]);
		// console.log(JSON.stringify(data, null, 2));
		setState('generate');
	}, [getResources]);

	const creatNewTenant = useCallback(async () => {
		const name = 'test-tenant-' + randomName('', '');
		setTenantId(name);
		const body: CreateTenantBody = {
			key: name,
			name: name,
			description:
				'This is a tenant created by permit-cli for creating test users',
			attributes: {},
		};
		const { error } = await createTenant(body);
		if (error) {
			setError(error);
			return;
		}
		setState('resources');
	}, [createTenant]);

	const generateRBACConfig = useCallback(
		(users: string[], userRoleMappingRBAC: Record<string, RoleRead[]>) => {
			const config = users.flatMap(user =>
				resources.flatMap(resource =>
					Object.entries(resource.actions).flatMap(([, action]) => {
						let result = false;
						userRoleMappingRBAC[user]?.forEach(role => {
							result ||=
								role.permissions?.includes(`${resource.key}:${action.key}`) ??
								false;
						});
						return {
							user: user,
							action: action.key ?? '',
							resource: resource.key,
							result: result,
						};
					}),
				),
			);

			setFinalConfig(prev => [...prev, ...config]);
			setModelsGenerated(prev => prev + 1);
		},
		[resources],
	);

	const saveConfigToPath = useCallback(async () => {
		try {
			const dir = pathModule.dirname(path ?? '');

			// Ensure the directory exists
			await fs.mkdir(dir, { recursive: true });

			// Write config as pretty JSON
			const json = JSON.stringify(finalConfig, null, 2);
			await fs.writeFile(path ?? '', json, 'utf8');
			setState('done');
		} catch (err) {
			setError(err instanceof Error ? err.message : '');
		}
	}, [finalConfig, path]);

	// Check if we have generated all config.
	useEffect(() => {
		if (modelsGenerated === models.length) {
			if (!path) {
				setState('done');
			} else {
				saveConfigToPath();
			}
		}
	}, [models, modelsGenerated, path, saveConfigToPath]);

	// Handle Error and lifecycle completion.
	useEffect(() => {
		if (error || state === 'done') {
			process.exit(1);
		}
	}, [error, state]);

	// Step 1 : Get all roles and resources
	useEffect(() => {
		if (state === 'roles') {
			fetchRoles();
		} else if (state === 'resources') {
			fetchResources();
		} else if (state === 'tenant') {
			creatNewTenant();
		}
	}, [creatNewTenant, fetchResources, fetchRoles, state]);

	useEffect(() => {
		if (state !== 'generate') return;

		if (models.includes('RBAC')) {
			let generatedUsers: string[] = [];
			const userRoleMappingRBAC: Record<string, RoleRead[]> = {};
			roles.forEach(role => {
				const userAllAccess = randomName('', ' ');
				const userNoAccess = randomName('', ' ');
				generatedUsers.push(userAllAccess);
				generatedUsers.push(userNoAccess);
				userRoleMappingRBAC[userAllAccess] = [role];
				userRoleMappingRBAC[userNoAccess] = [];
			});
			if (!dryRun) {
				createUserAndAttachRoles(generatedUsers, userRoleMappingRBAC);
			}
			generateRBACConfig(generatedUsers, userRoleMappingRBAC);
		}
	}, [
		createUserAndAttachRoles,
		dryRun,
		generateRBACConfig,
		models,
		roles,
		state,
	]);

	return (
		<>
			{state === 'roles' && <Text>Getting all roles</Text>}
			{roles.length > 0 && <Text>Roles found: {roles.length}</Text>}
			{state === 'tenant' && <Text>Crating a new Tenant</Text>}
			{tenantId && <Text>Created a new test tenant: {tenantId}</Text>}
			{state === 'generate' && (
				<Text>
					Generating test data for you <Spinner type={'dots3'} />{' '}
				</Text>
			)}
			{dryRun && <Text>Dry run mode!</Text>}
			{state === 'done' && path && <Text>Config saved to {path}</Text>}
			{state === 'done' && !path && (
				<Text> {JSON.stringify(finalConfig)} </Text>
			)}
			{error && <Text>{error}</Text>}
		</>
	);
}

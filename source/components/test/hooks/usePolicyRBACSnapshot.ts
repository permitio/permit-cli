import { RoleRead, useRolesApi } from '../../../hooks/useRolesApi.js';
import {
	CreateTenantBody,
	CreateUserBody,
	useTenantApi,
} from '../../../hooks/useTenantApi.js';
import {
	ResourceRead,
	useResourcesApi,
} from '../../../hooks/useResourcesApi.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import randomName from '@scaleway/random-name';
import {
	DryUser,
	GeneratePolicySnapshotProps,
} from '../GeneratePolicySnapshot.js';
import { useUserApi } from '../../../hooks/useUserApi.js';

type RBACResource = {
	type: string;
	tenant: string;
};

export type RBACConfig = {
	user: string;
	action: string;
	resource: RBACResource;
	result: boolean;
};

export const useGeneratePolicyRBACSnapshot = ({
	dryRun,
	models,
	isTestTenant = true,
}: GeneratePolicySnapshotProps) => {
	const { getRoles } = useRolesApi();
	const { createTenant } = useTenantApi();
	const { getResources } = useResourcesApi();
	const { createUser } = useUserApi();

	const [error, setError] = useState<null | string>(null);
	const [state, setState] = useState<
		| 'roles'
		| 'rbac-tenant'
		| 'rbac-users'
		| 'rbac-generate'
		| 'resources'
		| 'done'
	>('roles');
	const [dryUsers, setDryUsers] = useState<DryUser[]>([]);
	const [finalConfig, setFinalConfig] = useState<RBACConfig[]>([]);

	const [tenantId, setTenantId] = useState<string | undefined>(undefined);
	const tenantIdRef = useRef<string | undefined>(undefined);
	const rolesRef = useRef<RoleRead[]>([]);
	const resourcesRef = useRef<ResourceRead[]>([]);
	const generatedUsersRBACRef = useRef<string[]>([]);
	const userRoleMappingRBACRef = useRef<Record<string, RoleRead[]>>({});
	const [createdUsers, setCreatedUsers] = useState<DryUser[]>([]);
	const buildUserInfoFromUsername = useCallback((user: string) => {
		const [firstName = '', lastName = ''] = user.split(' ');
		return {
			key: firstName + lastName,
			email: firstName + lastName + '@gmail.com',
			firstName,
			lastName,
		};
	}, []);

	const createUserAndAttachRoles = useCallback(
		async (
			usernames: string[],
			userRoleMappings: Record<string, RoleRead[]>,
		) => {
			if (usernames.length === 0) {
				// eslint-disable-next-line sonarjs/no-duplicate-string
				setState('rbac-generate');
				return;
			}

			try {
				for (const user of usernames) {
					const { key, email, firstName, lastName } =
						buildUserInfoFromUsername(user);

					const roles = userRoleMappings[user] || [];

					const body: CreateUserBody = {
						key: key,
						first_name: firstName,
						last_name: lastName,
						email: email,
						attributes: {},
						role_assignments: roles.map(role => ({
							role: role.key,
							tenant: tenantIdRef.current || 'default',
						})),
					};

					if (dryRun) {
						setDryUsers(prev => [
							...prev,
							{
								key: body.key,
								email: body.email ?? '',
								firstName: body.first_name ?? ' ',
								lastName: body.last_name ?? ' ',
								roles: body.role_assignments?.map(role => role.role) ?? [],
							},
						]);
						setState('rbac-generate');
						return;
					}

					const result = await createUser(body);

					if (result.error) {
						setError(result.error);
						return;
					}

					setCreatedUsers(prev => [
						...prev,
						{
							key: body.key,
							email: body.email ?? '',
							firstName: body.first_name ?? ' ',
							lastName: body.last_name ?? ' ',
							roles: body.role_assignments?.map(role => role.role) ?? [],
						},
					]);
				}
				setState('rbac-generate');
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		},
		[buildUserInfoFromUsername, createUser, dryRun],
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
		rolesRef.current = data as RoleRead[];
		setState('rbac-tenant');
	}, [getRoles]);

	const fetchResources = useCallback(async () => {
		const { data, error } = await getResources();
		if (error) {
			setError(error);
			return;
		}
		resourcesRef.current = data as ResourceRead[];
		setState('rbac-users');
	}, [getResources]);

	const createNewTenant = useCallback(async () => {
		if (!isTestTenant) {
			tenantIdRef.current = 'default';
			setTenantId('default');
			setState('resources');
			return;
		}
		const name = 'test-tenant-' + randomName('', '');
		tenantIdRef.current = name;
		setTenantId(name);
		if (dryRun) {
			setState('resources');
			return;
		}
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
	}, [createTenant, dryRun, isTestTenant]);

	const generateRBACConfig = useCallback(() => {
		const config: RBACConfig[] = generatedUsersRBACRef.current.flatMap(user =>
			resourcesRef.current.flatMap(resource =>
				Object.entries(resource.actions).flatMap(([, action]) => {
					let result = false;
					userRoleMappingRBACRef.current[user]?.forEach(role => {
						result ||=
							role.permissions?.includes(`${resource.key}:${action.key}`) ??
							false;
					});
					const { key } = buildUserInfoFromUsername(user);
					return {
						user: key,
						action: action.key ?? '',
						resource: { type: resource.key, tenant: tenantIdRef.current ?? '' },
						result: result,
					};
				}),
			),
		);

		setFinalConfig(prev => [...prev, ...config]);
		setState('done');
	}, [buildUserInfoFromUsername]);

	const generateUsersAndRoleMapping = useCallback(() => {
		let generatedUsers: string[] = [];
		const userRoleMappingRBAC: Record<string, RoleRead[]> = {};
		const userNoAccess = randomName('', ' ');
		generatedUsers.push(userNoAccess);
		userRoleMappingRBAC[userNoAccess] = [];
		rolesRef.current.forEach(role => {
			const userAllAccess = randomName('', ' ');
			generatedUsers.push(userAllAccess);
			userRoleMappingRBAC[userAllAccess] = [role];
		});
		generatedUsersRBACRef.current = [
			...generatedUsersRBACRef.current,
			...generatedUsers,
		];
		userRoleMappingRBACRef.current = userRoleMappingRBAC;
		return { generatedUsers, userRoleMappingRBAC };
	}, []);

	// Step 1 : Get all roles and resources

	useEffect(() => {
		if (!models.includes('RBAC')) return;

		if (state === 'roles') {
			fetchRoles();
		} else if (state === 'rbac-tenant') {
			createNewTenant();
		} else if (state === 'resources') {
			fetchResources();
		} else if (state === 'rbac-users') {
			const { generatedUsers, userRoleMappingRBAC } =
				generateUsersAndRoleMapping();
			createUserAndAttachRoles(generatedUsers, userRoleMappingRBAC);
		} else if (state === 'rbac-generate') {
			generateRBACConfig();
		}
	}, [
		createNewTenant,
		createUserAndAttachRoles,
		fetchResources,
		fetchRoles,
		generateRBACConfig,
		generateUsersAndRoleMapping,
		models,
		state,
	]);

	return {
		state,
		error,
		finalConfig,
		dryUsers,
		tenantId,
		createdUsers,
	};
};

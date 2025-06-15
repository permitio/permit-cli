import { useCallback, useEffect, useRef, useState } from 'react';
import {
	DryUser,
	GeneratePolicySnapshotProps,
} from '../GeneratePolicySnapshot.js';
import {
	ConditionSetRead,
	useConditionSetApi,
} from '../../../hooks/useConditionSetApi.js';
import {
	ConditionSetRuleRead,
	useSetPermissionsApi,
} from '../../../hooks/useSetPermissionsApi.js';
import randomName from '@scaleway/random-name';
import {
	CreateTenantBody,
	CreateUserBody,
	useTenantApi,
} from '../../../hooks/useTenantApi.js';
import { useUserApi } from '../../../hooks/useUserApi.js';
import {
	attributeBuilder,
	getRefValue,
} from '../../../utils/reverse-attributes.js';

type ABACUser =
	| {
			key: string;
			attributes?: Record<string, string | number | object>;
	  }
	| string;

type ABACResource =
	| {
			type: string;
			attributes?: Record<string, string | number | object>;
			tenant: string;
	  }
	| string;

export type ABACConfig = {
	user: ABACUser;
	action: string;
	resource: ABACResource;
	result: boolean;
};

type ConditionValue = {
	attr: string;
	condition: string;
	value: string;
};

export type ConditionRef = {
	attr: string;
	condition: string;
	value: string;
};

export const useGeneratePolicyABACSnapshot = ({
	dryRun,
	models,
}: GeneratePolicySnapshotProps) => {
	const { getConditionSets } = useConditionSetApi();
	const { getSetPermissions } = useSetPermissionsApi();
	const { createTenant } = useTenantApi();
	const { createUser } = useUserApi();

	const [error, setError] = useState<null | string>(null);
	const [state, setState] = useState<
		| 'condition-sets'
		| 'set-permissions'
		| 'create-tenant'
		| 'create-users'
		| 'done'
	>('condition-sets');

	const refResourceConditionSets = useRef<Record<string, ConditionSetRead>>({});
	const refUserConditionSets = useRef<Record<string, ConditionSetRead>>({});
	const refSetPermissions = useRef<ConditionSetRuleRead[]>([]);
	const refTenantId = useRef<string | null>(null);

	const [finalConfig, setFinalConfig] = useState<ABACConfig[]>([]);
	const [dryUsers, setDryUsers] = useState<DryUser[]>([]);

	const getResourceSets = useCallback(async () => {
		const { data, error } = await getConditionSets('resourceset');
		if (error) {
			setError(error);
		}
		(data as ConditionSetRead[])?.forEach(
			resourceSet =>
				(refResourceConditionSets.current[resourceSet.key] = resourceSet),
		);
	}, [getConditionSets]);

	const buildUserInfoFromUsername = useCallback((user: string) => {
		const [firstName = '', lastName = ''] = user.split(' ');
		return {
			key: firstName + lastName,
			email: firstName + lastName + '@gmail.com',
			firstName,
			lastName,
		};
	}, []);

	const createNewTenant = useCallback(async () => {
		const name = 'test-tenant-' + randomName('', '');
		refTenantId.current = name;
		if (dryRun) {
			// eslint-disable-next-line sonarjs/no-duplicate-string
			setState('create-users');
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
		setState('create-users');
	}, [createTenant, dryRun]);

	const createNewUser = useCallback(
		async (roles?: string[]) => {
			const user = randomName('', ' ');
			const { key, email, firstName, lastName } =
				buildUserInfoFromUsername(user);

			const body: CreateUserBody = {
				key: key,
				first_name: firstName,
				last_name: lastName,
				email: email,
				attributes: {},
			};
			if (roles) {
				body.role_assignments = roles.map(role => ({
					role: role,
					tenant: refTenantId.current || '',
				}));
			}

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
				return key;
			}

			const { error } = await createUser(body);
			if (error) {
				setError(error);
				return;
			}
			return key;
		},
		[buildUserInfoFromUsername, createUser, dryRun],
	);

	const getUserSets = useCallback(async () => {
		const { data, error } = await getConditionSets('userset');
		if (error) {
			setError(error);
		}
		(data as ConditionSetRead[])?.forEach(
			userSet => (refUserConditionSets.current[userSet.key] = userSet),
		);
	}, [getConditionSets]);

	const getUserResourceConditionSet = useCallback(async () => {
		await getResourceSets();
		await getUserSets();
		setState('set-permissions');
	}, [getResourceSets, getUserSets]);

	const getAllSetPermissions = useCallback(async () => {
		const { data, error } = await getSetPermissions();
		if (error) {
			setError(error);
			return;
		}
		refSetPermissions.current = data as ConditionSetRuleRead[];
		setState('create-tenant');
	}, [getSetPermissions]);

	const extractAllConditions = (
		conditions: Record<string, never>,
	): { conditionValues: ConditionValue[]; conditionRefs: ConditionRef[] } => {
		// will also yield ConditionRefs on a later date
		const conditionValues: ConditionValue[] = [];
		const conditionRefs: ConditionRef[] = [];

		const traverse = (node: Record<string, never>) => {
			if (typeof node === 'object' && node !== null) {
				Object.entries(node).forEach(([key, value]) => {
					// If it's an array, recurse into it (handling logical operators like allOf)
					if (Array.isArray(value)) {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-expect-error
						value.forEach(traverse);
					} else {
						// If it's a condition, extract the attribute, condition, and value
						Object.entries(value).forEach(([condition, val]) => {
							if (typeof val === 'object') {
								conditionRefs.push({
									attr: key,
									condition,
									value: (val as { ref: string }).ref,
								});
							} else {
								conditionValues.push({
									attr: key,
									condition,
									value: val as string,
								});
							}
						});
					}
				});
			}
		};
		traverse(conditions);
		return { conditionValues, conditionRefs };
	};

	const buildAttributesFromConditions = useCallback(
		({
			conditionValues,
			_conditionRefs: conditionRefs,
		}: {
			conditionValues: ConditionValue[];
			_conditionRefs: ConditionRef[]; // add support for refs later
		}) => {
			const attributes: Record<string, string | number | object> = {};
			conditionValues.forEach(condition => {
				const key = condition.attr.split('.')[1] ?? '';
				attributes[key] = attributeBuilder({
					value: condition.value,
					condition: condition.condition,
				});
			});
			const conditionMap: Record<string, ConditionRef> = {};
			conditionRefs.forEach(conditionRef => {
				const key = conditionRef.attr.split('.')[1] ?? '';
				conditionMap[key] = conditionRef;
			});
			Object.keys(conditionMap).forEach(key => {
				const ref = conditionMap[key]?.value.split('.')[1] ?? '';
				attributes[key] = getRefValue({ attributes, conditionMap, ref });
			});
			return attributes;
		},
		[],
	);

	const buildUserSetResourceCombination = useCallback(async () => {
		const userKey = (await createNewUser()) ?? '';

		const userSetResourcePermissions = refSetPermissions.current.filter(
			permission =>
				refUserConditionSets.current[permission.user_set] !== undefined &&
				refResourceConditionSets.current[permission.resource_set] === undefined,
		);

		const userSetResourceConfig: ABACConfig[] = userSetResourcePermissions.map(
			permission => {
				const currUserSet = refUserConditionSets.current[permission.user_set];
				const [resource, currAction] = permission.permission.split(':');
				const { conditionValues, conditionRefs } = extractAllConditions(
					currUserSet?.conditions ?? {},
				);
				const userAttributes = buildAttributesFromConditions({
					conditionValues,
					_conditionRefs: conditionRefs,
				});

				return {
					user: {
						key: userKey,
						attributes: userAttributes,
					},
					resource: resource ?? '',
					action: currAction ?? '',
					result: true,
				};
			},
		);
		setFinalConfig(config => [...config, ...userSetResourceConfig]);
	}, [buildAttributesFromConditions, createNewUser]);

	const buildResourceSetRolesCombination = useCallback(async () => {
		const resourceSetRolesPermissions = refSetPermissions.current.filter(
			permission =>
				refUserConditionSets.current[permission.user_set] === undefined &&
				refResourceConditionSets.current[permission.resource_set] !== undefined,
		);

		const ResourceSetRoleConfig: ABACConfig[] = await Promise.all(
			resourceSetRolesPermissions.map(async permission => {
				const userKey =
					(await createNewUser([permission.user_set.substring(10)])) ?? '';
				const currResourceSet =
					refResourceConditionSets.current[permission.resource_set];
				const [resource, currAction] = permission.permission.split(':');
				const { conditionValues, conditionRefs } = extractAllConditions(
					currResourceSet?.conditions ?? {},
				);
				const resourceAttributes = buildAttributesFromConditions({
					conditionValues,
					_conditionRefs: conditionRefs,
				});
				return {
					user: userKey,
					resource: {
						type: resource ?? '',
						attributes: resourceAttributes,
						tenant: refTenantId.current ?? '',
					},
					action: currAction ?? '',
					result: true,
				};
			}),
		);
		setFinalConfig(config => [...config, ...ResourceSetRoleConfig]);
	}, [buildAttributesFromConditions, createNewUser]);

	const buildResourceSetUserSetCombination = useCallback(async () => {
		const userKey = (await createNewUser()) ?? '';
		const resourceSetUserSetPermissions = refSetPermissions.current.filter(
			permission =>
				refUserConditionSets.current[permission.user_set] !== undefined &&
				refResourceConditionSets.current[permission.resource_set] !== undefined,
		);
		const resourceSetUserSetConfig: ABACConfig[] = await Promise.all(
			resourceSetUserSetPermissions.map(async permission => {
				const currResourceSet =
					refResourceConditionSets.current[permission.resource_set];
				const [resource, currAction] = permission.permission.split(':');
				const {
					conditionValues: resourceSetConditionValues,
					conditionRefs: resourceSetConditionRefs,
				} = extractAllConditions(currResourceSet?.conditions ?? {});
				const resourceAttributes = buildAttributesFromConditions({
					conditionValues: resourceSetConditionValues,
					_conditionRefs: resourceSetConditionRefs,
				});
				const currUserSet = refUserConditionSets.current[permission.user_set];

				const {
					conditionValues: userSetConditionValues,
					conditionRefs: usersSetConditionRefs,
				} = extractAllConditions(currUserSet?.conditions ?? {});
				const userAttributes = buildAttributesFromConditions({
					conditionValues: userSetConditionValues,
					_conditionRefs: usersSetConditionRefs,
				});
				return {
					user: {
						key: userKey,
						attributes: userAttributes,
					},
					resource: {
						type: resource ?? '',
						attributes: resourceAttributes,
						tenant: refTenantId.current ?? '',
					},
					action: currAction ?? '',
					result: true,
				};
			}),
		);
		setFinalConfig(config => [...config, ...resourceSetUserSetConfig]);
	}, [buildAttributesFromConditions, createNewUser]);

	const buildAllCombinations = useCallback(async () => {
		await buildUserSetResourceCombination();
		await buildResourceSetRolesCombination();
		await buildResourceSetUserSetCombination();
		setState('done');
	}, [
		buildResourceSetRolesCombination,
		buildResourceSetUserSetCombination,
		buildUserSetResourceCombination,
	]);

	useEffect(() => {
		if (!models.includes('ABAC')) return;
		if (state === 'condition-sets') {
			getUserResourceConditionSet();
		} else if (state === 'set-permissions') {
			getAllSetPermissions();
		} else if (state === 'create-tenant') {
			createNewTenant();
		} else if (state === 'create-users') {
			buildAllCombinations();
		}
	}, [
		state,
		models,
		getUserResourceConditionSet,
		getAllSetPermissions,
		createNewTenant,
		buildAllCombinations,
	]);

	return {
		state,
		error,
		finalConfig,
		dryUsers,
	};
};

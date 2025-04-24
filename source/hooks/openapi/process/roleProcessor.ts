import {
	sanitizeKey,
	isDuplicateError,
	PathItem,
	Operation,
	HTTP_METHODS,
	ApiResponse,
} from '../../../utils/openapiUtils.js';
import {
	ERROR_CREATING_ROLE,
	ERROR_UPDATING_ROLE,
	ERROR_CREATING_RESOURCE_ROLE,
	PERMIT_EXTENSIONS,
	ProcessorContext,
	RoleWithPermissions,
} from './openapiConstants.js';
import { RoleResponse } from './apiTypes.js';

// Define function signatures
type GetRoleFunction = (
	role: string,
) => Promise<ApiResponse<RoleWithPermissions>>;
type CreateRoleFunction = (
	key: string,
	name: string,
) => Promise<ApiResponse<RoleResponse>>;
type UpdateRoleFunction = (
	key: string,
	name: string,
	permissions: string[],
) => Promise<ApiResponse<RoleResponse>>;
type CreateResourceRoleFunction = (
	resource: string,
	role: string,
	name: string,
	permission: string,
) => Promise<ApiResponse<RoleResponse>>;

// Define updateExistingRole function before it's used
async function updateExistingRole(
	role: string,
	permissionStr: string | undefined,
	context: ProcessorContext,
	getRole: GetRoleFunction,
	updateRole: UpdateRoleFunction,
) {
	const { warnings } = context;

	try {
		// Get existing role to preserve permissions
		const { data: roleObject } = await getRole(role);

		// Access permissions safely from the role object
		const existingPermissions = roleObject?.permissions || [];
		let permissions: string[] = Array.isArray(existingPermissions)
			? existingPermissions
			: [];

		if (permissionStr && !permissions.includes(permissionStr)) {
			permissions = [...permissions, permissionStr];
		}

		// Update the role with the new permissions
		const updateResult = await updateRole(role, role, permissions);
		if (updateResult.error) {
			warnings.push(
				`${ERROR_UPDATING_ROLE} ${role}: ${JSON.stringify(updateResult.error)}`,
			);
		}
	} catch (getRoleError) {
		warnings.push(`Failed to get role details for ${role}: ${getRoleError}`);
	}
}

export async function processRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	getRole: GetRoleFunction,
	createRole: CreateRoleFunction,
	updateRole: UpdateRoleFunction,
) {
	const { roles, existingRoles, errors, warnings } = context;

	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		// Process HTTP methods for roles
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Create/update role if specified and not already processed
			const role = operation[PERMIT_EXTENSIONS.ROLE];
			if (role && !roles.has(role as string)) {
				// Check if role already exists
				const roleExists = existingRoles.some(r => r.key === role);

				// Get the operation's resource and action for permissions
				const resource = sanitizeKey(
					(typedPathItem[PERMIT_EXTENSIONS.RESOURCE] as string) || '',
				);
				const action = operation[PERMIT_EXTENSIONS.ACTION] || method;

				// Create permission string if resource and action exist
				const permissionStr =
					resource && action ? `${resource}:${action}` : undefined;

				if (!roleExists) {
					try {
						const result = await createRole(role as string, role as string);
						if (result.error) {
							if (!isDuplicateError(result.error)) {
								errors.push(
									`${ERROR_CREATING_ROLE} ${role}: ${JSON.stringify(result.error)}`,
								);
							} else {
								// Role exists but wasn't in our list, try to update it
								await updateExistingRole(
									role as string,
									permissionStr,
									context,
									getRole,
									updateRole,
								);
							}
						} else {
							// If we have a permission to add, update the role with it
							if (permissionStr) {
								try {
									await updateRole(role as string, role as string, [
										permissionStr,
									]);
								} catch (updateError) {
									warnings.push(
										`Failed to add permission to role ${role}: ${updateError}`,
									);
								}
							}
						}
					} catch (roleError) {
						errors.push(`Error creating role ${role}: ${roleError}`);
					}
				} else {
					await updateExistingRole(
						role as string,
						permissionStr,
						context,
						getRole,
						updateRole,
					);
				}

				roles.add(role as string);
			}
		}
	}

	return context;
}

export async function processResourceRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createResourceRole: CreateResourceRoleFunction,
) {
	const { resourceRoles, errors, warnings } = context;

	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
		if (!rawResource) continue;

		const resource = sanitizeKey(rawResource as string);

		// Process HTTP methods
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Process resource roles
			const resourceRole = operation[PERMIT_EXTENSIONS.RESOURCE_ROLE];
			if (resourceRole) {
				const sanitizedResourceRole = `${resource}_${resourceRole}`;
				if (!resourceRoles.has(sanitizedResourceRole)) {
					try {
						// Create individual permission for specific action instead of wildcard
						const action = operation[PERMIT_EXTENSIONS.ACTION] || method;
						const permissionString = `${resource}:${action}`;

						const result = await createResourceRole(
							resource,
							sanitizedResourceRole,
							`${rawResource} ${resourceRole}`,
							permissionString,
						);

						if (result.error) {
							if (!isDuplicateError(result.error)) {
								errors.push(
									`${ERROR_CREATING_RESOURCE_ROLE} ${resourceRole}: ${JSON.stringify(result.error)}`,
								);
							} else {
								warnings.push(
									`Resource role ${sanitizedResourceRole} already exists, skipping creation`,
								);
							}
						}
						resourceRoles.set(sanitizedResourceRole, true);
					} catch (resourceRoleError) {
						errors.push(
							`Error creating resource role ${resourceRole}: ${resourceRoleError}`,
						);
					}
				}
			}
		}
	}

	return context;
}

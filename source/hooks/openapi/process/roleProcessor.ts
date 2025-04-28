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
	permission: string | string[],
) => Promise<ApiResponse<RoleResponse>>;
type UpdateResourceRoleFunction = (
	resource: string,
	role: string,
	permission: string | string[],
) => Promise<ApiResponse<RoleResponse>>;

// Helper function to capitalize first letter of a string
function capitalizeFirstLetter(str: string): string {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

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

		// Add the new permission if it doesn't already exist
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
	const { roles, existingRoles, errors } = context;

	// First, process all top-level roles to ensure they exist
	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		// Process HTTP methods for roles
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Create/update role if specified and not already processed
			const role = operation[PERMIT_EXTENSIONS.ROLE];
			if (role && typeof role === 'string' && !roles.has(role)) {
				const displayName = capitalizeFirstLetter(role);

				// Check if role already exists
				const roleExists = existingRoles.some(r => r.key === role);

				if (!roleExists) {
					try {
						const result = await createRole(role, displayName);
						if (result.error && !isDuplicateError(result.error)) {
							errors.push(
								`${ERROR_CREATING_ROLE} ${role}: ${JSON.stringify(result.error)}`,
							);
						}
					} catch (roleError) {
						errors.push(`Error creating role ${role}: ${roleError}`);
					}
				}
				roles.add(role);
			} else if (role && Array.isArray(role)) {
				// Handle array of roles
				for (const singleRole of role) {
					if (typeof singleRole === 'string' && !roles.has(singleRole)) {
						const displayName = capitalizeFirstLetter(singleRole);

						// Check if role already exists
						const roleExists = existingRoles.some(r => r.key === singleRole);

						if (!roleExists) {
							try {
								const result = await createRole(singleRole, displayName);
								if (result.error && !isDuplicateError(result.error)) {
									errors.push(
										`${ERROR_CREATING_ROLE} ${singleRole}: ${JSON.stringify(result.error)}`,
									);
								}
							} catch (roleError) {
								errors.push(`Error creating role ${singleRole}: ${roleError}`);
							}
						}
						roles.add(singleRole);
					}
				}
			}
		}
	}

	// Now assign permissions to all roles
	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		// Get both the original resource name and the sanitized key
		const originalResource = typedPathItem[
			PERMIT_EXTENSIONS.RESOURCE
		] as string;
		const resource = sanitizeKey(originalResource || '');

		// Skip if no resource defined
		if (!resource) continue;

		// Process HTTP methods to assign permissions
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Get the operation's action for permissions
			const action = operation[PERMIT_EXTENSIONS.ACTION] || method;

			// Create permission string if resource and action exist
			const permissionStr =
				resource && action ? `${resource}:${action}` : undefined;
			if (!permissionStr) continue;

			// Assign permission to roles specified by this operation
			const role = operation[PERMIT_EXTENSIONS.ROLE];
			if (role && typeof role === 'string') {
				await updateExistingRole(
					role,
					permissionStr,
					context,
					getRole,
					updateRole,
				);
			}

			// Handle array of roles if specified that way
			if (role && Array.isArray(role)) {
				for (const singleRole of role) {
					if (typeof singleRole === 'string') {
						await updateExistingRole(
							singleRole,
							permissionStr,
							context,
							getRole,
							updateRole,
						);
					}
				}
			}
		}
	}

	return context;
}

// Helper function to update resource role permissions
async function updateResourceRolePermission(
	resource: string,
	roleKey: string,
	permissionStr: string | string[],
	context: ProcessorContext,
	updateResourceRole: UpdateResourceRoleFunction,
) {
	const { warnings } = context;
	try {
		// Convert to array if it's a single string
		const permissionsArray = Array.isArray(permissionStr)
			? permissionStr
			: [permissionStr];

		// Call the update function with all permissions
		const result = await updateResourceRole(
			resource,
			roleKey,
			permissionsArray,
		);

		if (result.error) {
			warnings.push(
				`Failed to update resource role ${roleKey}: ${JSON.stringify(result.error)}`,
			);
		}
	} catch (error) {
		warnings.push(`Error updating resource role ${roleKey}: ${error}`);
	}
}

export async function processResourceRoles(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
	createResourceRole: CreateResourceRoleFunction,
	updateResourceRole: UpdateResourceRoleFunction,
) {
	const { resourceRoles, errors, warnings } = context;

	// Map to track which actions are assigned to which resource-role pairs
	const roleActionMap = new Map<string, Set<string>>();

	// Collect all resource roles and their specific actions
	for (const [, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const rawResource = pathItem[PERMIT_EXTENSIONS.RESOURCE];
		if (!rawResource) continue;

		const resource = sanitizeKey(rawResource as string);

		// Process HTTP methods
		for (const method of HTTP_METHODS) {
			const operation = pathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Get action for this operation
			const action = operation[PERMIT_EXTENSIONS.ACTION] || method;

			// Get resource role for this operation
			const resourceRole = operation[PERMIT_EXTENSIONS.RESOURCE_ROLE];
			if (resourceRole && typeof resourceRole === 'string') {
				// Create a unique key for this resource-role pair
				const mapKey = `${resource}:${resourceRole}`;

				// Initialize action set if needed
				if (!roleActionMap.has(mapKey)) {
					roleActionMap.set(mapKey, new Set<string>());
				}

				// Add this action to the role's action set
				roleActionMap.get(mapKey)?.add(action.toString());
			}
		}
	}

	//Create each resource role with its specific actions
	for (const [mapKey, actionSet] of roleActionMap.entries()) {
		// Skip if already processed
		if (resourceRoles.has(mapKey)) {
			continue;
		}

		const parts = mapKey.split(':');
		if (parts.length !== 2) {
			warnings.push(`Invalid resource role key: ${mapKey}`);
			continue;
		}

		const resourceKey = parts[0];
		const roleKey = parts[1];

		if (!resourceKey || !roleKey) {
			warnings.push(`Invalid resource or role in key: ${mapKey}`);
			continue;
		}

		const actions = Array.from(actionSet);

		if (actions.length === 0) {
			warnings.push(`No actions defined for role ${resourceKey}:${roleKey}`);
			continue;
		}

		// Find original resource name, use resourceKey as fallback
		let originalResourceName = resourceKey;
		for (const [, item] of Object.entries(pathItems)) {
			if (
				item &&
				typeof item === 'object' &&
				item[PERMIT_EXTENSIONS.RESOURCE] &&
				sanitizeKey(item[PERMIT_EXTENSIONS.RESOURCE] as string) === resourceKey
			) {
				originalResourceName = item[PERMIT_EXTENSIONS.RESOURCE] as string;
				break;
			}
		}

		// Properly capitalized display name
		const displayName = `${capitalizeFirstLetter(originalResourceName)}#${capitalizeFirstLetter(roleKey)}`;

		try {
			const result = await createResourceRole(
				resourceKey,
				roleKey,
				displayName,
				actions, // Only the actions explicitly assigned to this role
			);

			if (result.error) {
				if (!isDuplicateError(result.error)) {
					errors.push(
						`${ERROR_CREATING_RESOURCE_ROLE} ${displayName}: ${JSON.stringify(result.error)}`,
					);
				} else {
					// Role exists, update with only this role's permissions
					await updateResourceRolePermission(
						resourceKey,
						roleKey,
						actions,
						context,
						updateResourceRole,
					);
				}
			}

			resourceRoles.set(mapKey, true);
		} catch (error) {
			errors.push(
				`Error creating/updating resource role ${displayName}: ${error}`,
			);
		}
	}

	return context;
}

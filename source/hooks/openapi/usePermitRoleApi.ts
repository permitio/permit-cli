import { useCallback, useMemo } from 'react';
import useClient from '../../hooks/useClient.js';

/**
 * Hook for role-related Permit API operations
 */
export const usePermitRoleApi = () => {
	const { authenticatedApiClient } = useClient();

	// Define constants for repeated strings
	const OPENAPI_DESCRIPTION = 'Role created from OpenAPI spec';
	const ROLES_ENDPOINT = '/v2/schema/{proj_id}/{env_id}/roles';

	/**
	 * List all roles in the current environment
	 */
	const listRoles = useCallback(async () => {
		return await authenticatedApiClient().GET(ROLES_ENDPOINT);
	}, [authenticatedApiClient]);

	/**
	 * Get a specific role by key
	 */
	const getRole = useCallback(
		async (roleKey: string) => {
			return await authenticatedApiClient().GET(`${ROLES_ENDPOINT}/{role_id}`, {
				role_id: roleKey,
			});
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates a new role
	 */
	const createRole = useCallback(
		async (roleKey: string, roleName: string) => {
			return await authenticatedApiClient().POST(ROLES_ENDPOINT, undefined, {
				key: roleKey,
				name: roleName,
				description: OPENAPI_DESCRIPTION,
				permissions: [],
			});
		},
		[authenticatedApiClient],
	);

	/**
	 * Updates an existing role with new permissions
	 */
	const updateRole = useCallback(
		async (roleKey: string, roleName: string, permissions: string[] = []) => {
			return await authenticatedApiClient().PATCH(
				`${ROLES_ENDPOINT}/{role_id}`,
				{ role_id: roleKey },
				{
					name: roleName,
					description: `${OPENAPI_DESCRIPTION} (updated)`,
					permissions: permissions,
				},
			);
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates a resource-specific role with permissions
	 */
	const createResourceRole = useCallback(
		async (
			resourceKey: string,
			roleKey: string,
			roleName: string,
			permissionString: string | string[],
		) => {
			// Handle both single permission and array of permissions
			let permissions: string[];
			if (typeof permissionString === 'string') {
				permissions = [permissionString];
			} else if (Array.isArray(permissionString)) {
				permissions = permissionString;
			} else {
				permissions = [];
			}

			// Ensure no duplicate permissions
			permissions = [...new Set(permissions)];

			return await authenticatedApiClient().POST(
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles',
				{ resource_id: resourceKey },
				{
					key: roleKey,
					name: roleName,
					description: `${OPENAPI_DESCRIPTION} for ${resourceKey}`,
					permissions: permissions,
				},
			);
		},
		[authenticatedApiClient],
	);

	/**
	 * Update a resource-specific role with additional permissions
	 */
	const updateResourceRole = useCallback(
		async (
			resourceKey: string,
			roleKey: string,
			permissionString: string | string[],
		) => {
			// First get existing role permissions
			const { data: roleData } = await authenticatedApiClient().GET(
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
				{ resource_id: resourceKey, role_id: roleKey },
			);

			// Extract existing permissions
			const existingPermissions = roleData?.permissions || [];

			// Prepare permissions to add
			let newPermissions: string[];
			if (typeof permissionString === 'string') {
				newPermissions = [permissionString];
			} else if (Array.isArray(permissionString)) {
				newPermissions = permissionString;
			} else {
				newPermissions = [];
			}

			// Merge permissions (deduplicate)
			const allPermissions = [
				...new Set([...existingPermissions, ...newPermissions]),
			];

			// Update the role
			return await authenticatedApiClient().PATCH(
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/roles/{role_id}',
				{ resource_id: resourceKey, role_id: roleKey },
				{
					permissions: allPermissions,
					extends: [],
				},
			);
		},
		[authenticatedApiClient],
	);

	// Return all role-related functions
	return useMemo(
		() => ({
			listRoles,
			getRole,
			createRole,
			updateRole,
			createResourceRole,
			updateResourceRole,
		}),
		[
			listRoles,
			getRole,
			createRole,
			updateRole,
			createResourceRole,
			updateResourceRole,
		],
	);
};

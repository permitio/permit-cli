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
	}, [authenticatedApiClient, ROLES_ENDPOINT]);

	/**
	 * Get a specific role by key
	 */
	const getRole = useCallback(
		async (roleKey: string) => {
			return await authenticatedApiClient().GET(`${ROLES_ENDPOINT}/{role_id}`, {
				role_id: roleKey,
			});
		},
		[authenticatedApiClient, ROLES_ENDPOINT],
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
		[authenticatedApiClient, ROLES_ENDPOINT, OPENAPI_DESCRIPTION],
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
		[authenticatedApiClient, ROLES_ENDPOINT, OPENAPI_DESCRIPTION],
	);

	/**
	 * Creates a resource-specific role
	 */
	const createResourceRole = useCallback(
		async (
			resourceKey: string,
			roleKey: string,
			roleName: string,
			permissionString: string,
		) => {
			return await authenticatedApiClient().POST(ROLES_ENDPOINT, undefined, {
				key: roleKey,
				name: roleName,
				description: `${OPENAPI_DESCRIPTION} for ${resourceKey}`,
				permissions: [permissionString],
			});
		},
		[authenticatedApiClient, ROLES_ENDPOINT, OPENAPI_DESCRIPTION],
	);

	return useMemo(
		() => ({
			listRoles,
			getRole,
			createRole,
			updateRole,
			createResourceRole,
		}),
		[listRoles, getRole, createRole, updateRole, createResourceRole],
	);
};

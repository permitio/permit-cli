import { useCallback, useMemo } from 'react';
import { MethodE, fetchUtil } from '../../utils/fetchUtil.js';
import { useAuth } from '../../components/AuthProvider.js';
import { PERMIT_API_URL } from '../../config.js';
import { ApiResponse } from '../../utils/openapiUtils.js';

/**
 * Hook for role-related Permit API operations
 */
export const usePermitRoleApi = () => {
	const { authToken, scope } = useAuth();

	// Construct base URL with the correct project and environment IDs
	const getBaseUrl = useCallback(() => {
		return `${PERMIT_API_URL}/v2/schema/${scope.project_id}/${scope.environment_id}`;
	}, [scope.project_id, scope.environment_id]);

	/**
	 * Make authenticated API call
	 */
	const callApi = useCallback(
		async (
			endpoint: string,
			method: MethodE,
			body?: object,
		): Promise<ApiResponse> => {
			try {
				const response = await fetchUtil(
					endpoint,
					method,
					authToken,
					undefined,
					body,
				);

				return response as ApiResponse;
			} catch (error) {
				return { success: false, error: String(error) };
			}
		},
		[authToken],
	);

	/**
	 * List all roles in the current environment
	 */
	const listRoles = useCallback(async () => {
		const url = `${getBaseUrl()}/roles`;
		return await callApi(url, MethodE.GET);
	}, [callApi, getBaseUrl]);

	/**
	 * Get a specific role by key
	 */
	const getRole = useCallback(
		async (roleKey: string) => {
			const url = `${getBaseUrl()}/roles/${roleKey}`;
			return await callApi(url, MethodE.GET);
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Creates a new role
	 */
	const createRole = useCallback(
		async (roleKey: string, roleName: string) => {
			const url = `${getBaseUrl()}/roles`;
			return await callApi(url, MethodE.POST, {
				key: roleKey,
				name: roleName,
				description: `Role created from OpenAPI spec`,
				permissions: [],
			});
		},
		[callApi, getBaseUrl],
	);

	/**
	 * Updates an existing role with new permissions
	 * This is used when a role already exists
	 */
	const updateRole = useCallback(
		async (roleKey: string, roleName: string, permissions: string[] = []) => {
			const url = `${getBaseUrl()}/roles/${roleKey}`;
			return await callApi(url, MethodE.PATCH, {
				name: roleName,
				description: `Role updated from OpenAPI spec`,
				permissions: permissions,
			});
		},
		[callApi, getBaseUrl],
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
			const url = `${getBaseUrl()}/roles`;
			return await callApi(url, MethodE.POST, {
				key: roleKey,
				name: roleName,
				description: `Resource role created from OpenAPI spec for ${resourceKey}`,
				permissions: [permissionString],
			});
		},
		[callApi, getBaseUrl],
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

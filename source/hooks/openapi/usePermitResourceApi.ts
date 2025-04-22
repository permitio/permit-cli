import { useCallback, useMemo } from 'react';
import useClient from '../../hooks/useClient.js';

/**
 * Hook for resource-related Permit API operations
 */
export const usePermitResourceApi = () => {
	const { authenticatedApiClient } = useClient();

	/**
	 * List all resources in the current environment
	 */
	const listResources = useCallback(async () => {
		return await authenticatedApiClient().GET(
			'/v2/schema/{proj_id}/{env_id}/resources',
		);
	}, [authenticatedApiClient]);

	/**
	 * Creates a new resource in Permit
	 */
	const createResource = useCallback(
		async (resourceKey: string, resourceName: string) => {
			return await authenticatedApiClient().POST(
				'/v2/schema/{proj_id}/{env_id}/resources',
				undefined,
				{
					key: resourceKey,
					name: resourceName,
					description: `Resource created from OpenAPI spec`,
					actions: {},
					attributes: {},
				},
			);
		},
		[authenticatedApiClient],
	);

	/**
	 * Updates an existing resource in Permit
	 */
	const updateResource = useCallback(
		async (resourceKey: string, resourceName: string) => {
			return await authenticatedApiClient().PATCH(
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}',
				{ resource_id: resourceKey },
				{
					name: resourceName,
					description: `Resource updated from OpenAPI spec`,
				},
			);
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates a new action for a resource
	 */
	const createAction = useCallback(
		async (resourceKey: string, actionKey: string, actionName: string) => {
			return await authenticatedApiClient().POST(
				'/v2/schema/{proj_id}/{env_id}/resources/{resource_id}/actions',
				{ resource_id: resourceKey },
				{
					key: actionKey,
					name: actionName,
					description: `Action created from OpenAPI spec`,
				},
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			listResources,
			createResource,
			updateResource,
			createAction,
		}),
		[listResources, createResource, updateResource, createAction],
	);
};

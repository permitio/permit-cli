import { useCallback, useMemo } from 'react';
import { MethodE, fetchUtil } from '../../utils/fetchUtil.js';
import { useAuth } from '../../components/AuthProvider.js';
import { PERMIT_API_URL } from '../../config.js';
import { ApiResponse } from '../../utils/openapiUtils.js';

/**
 * Hook for resource-related Permit API operations
 */
export const usePermitResourceApi = () => {
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
   * List all resources in the current environment
   */
  const listResources = useCallback(async () => {
    const url = `${getBaseUrl()}/resources`;
    return await callApi(url, MethodE.GET);
  }, [callApi, getBaseUrl]);

  /**
   * Creates a new resource in Permit
   */
  const createResource = useCallback(
    async (resourceKey: string, resourceName: string) => {
      const url = `${getBaseUrl()}/resources`;
      return await callApi(url, MethodE.POST, {
        key: resourceKey,
        name: resourceName,
        description: `Resource created from OpenAPI spec`,
        actions: {},
        attributes: {},
      });
    },
    [callApi, getBaseUrl],
  );

  /**
   * Updates an existing resource in Permit
   */
  const updateResource = useCallback(
    async (resourceKey: string, resourceName: string) => {
      const url = `${getBaseUrl()}/resources/${resourceKey}`;
      return await callApi(url, MethodE.PATCH, {
        name: resourceName,
        description: `Resource updated from OpenAPI spec`,
      });
    },
    [callApi, getBaseUrl],
  );

  /**
   * Creates a new action for a resource
   */
  const createAction = useCallback(
    async (resourceKey: string, actionKey: string, actionName: string) => {
      const url = `${getBaseUrl()}/resources/${resourceKey}/actions`;
      return await callApi(url, MethodE.POST, {
        key: actionKey,
        name: actionName,
        description: `Action created from OpenAPI spec`,
      });
    },
    [callApi, getBaseUrl],
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
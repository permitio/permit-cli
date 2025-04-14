import { useCallback, useMemo } from 'react';
import { MethodE, fetchUtil } from '../../utils/fetchUtil.js';
import { useAuth } from '../../components/AuthProvider.js';
import { PERMIT_API_URL } from '../../config.js';
import { ApiResponse, UrlMapping } from '../../utils/openapiUtils.js';

/**
 * Hook for URL mapping API operations
 */
export const usePermitUrlMappingApi = () => {
  const { authToken, scope } = useAuth();

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
   * Delete existing URL mappings by config key
   */
  const deleteUrlMappings = useCallback(
    async (configKey: string) => {
      const url = `${PERMIT_API_URL}/v2/facts/${scope.project_id}/${scope.environment_id}/proxy_configs/${configKey}`;
      return await callApi(url, MethodE.DELETE);
    },
    [callApi, scope.project_id, scope.environment_id],
  );

  /**
   * Creates URL mappings for the Permit proxy
   */
  const createUrlMappings = useCallback(
    async (mappings: UrlMapping[], authMechanism: string, secret: string) => {
      const url = `${PERMIT_API_URL}/v2/facts/${scope.project_id}/${scope.environment_id}/proxy_configs`;
      return await callApi(url, MethodE.POST, {
        key: 'openapi',
        name: 'OpenAPI Generated Mappings',
        mapping_rules: mappings,
        auth_mechanism: authMechanism, // Must be 'Bearer', 'Basic', or 'Headers'
        secret: secret,
      });
    },
    [callApi, scope.project_id, scope.environment_id],
  );

  return useMemo(
    () => ({
      deleteUrlMappings,
      createUrlMappings,
    }),
    [deleteUrlMappings, createUrlMappings],
  );
};
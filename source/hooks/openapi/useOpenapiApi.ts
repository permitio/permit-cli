import { useMemo } from 'react';
import { usePermitResourceApi } from './usePermitResourceApi.js';
import { usePermitRoleApi } from './usePermitRoleApi.js';
import { usePermitRelationApi } from './usePermitRelationApi.js';
import { usePermitUrlMappingApi } from './usePermitUrlMappingApi.js';

/**
 * Hook to interact with Permit API for OpenAPI spec processing
 *
 * This hook combines multiple specialized hooks to provide a unified API
 * for the OpenAPI component to interact with the Permit system.
 *
 * @returns Object with methods to create Permit policy elements
 */
export const useOpenapiApi = () => {
  const {
    listResources,
    createResource,
    updateResource,
    createAction,
  } = usePermitResourceApi();

  const {
    listRoles,
    getRole,
    createRole,
    updateRole,
    createResourceRole,
  } = usePermitRoleApi();

  const {
    getRelationByKey,
    createRelation,
    createDerivedRole,
  } = usePermitRelationApi();

  const {
    deleteUrlMappings,
    createUrlMappings,
  } = usePermitUrlMappingApi();

  return useMemo(
    () => ({
      // Resource operations
      listResources,
      createResource,
      updateResource,
      createAction,

      // Role operations
      listRoles,
      getRole,
      createRole,
      updateRole,
      createResourceRole,

      // Relation operations
      getRelationByKey,
      createRelation,
      createDerivedRole,

      // URL mapping operations
      deleteUrlMappings,
      createUrlMappings,
    }),
    [
      // Resource operations
      listResources,
      createResource,
      updateResource,
      createAction,

      // Role operations
      listRoles,
      getRole,
      createRole,
      updateRole,
      createResourceRole,

      // Relation operations
      getRelationByKey,
      createRelation,
      createDerivedRole,

      // URL mapping operations
      deleteUrlMappings,
      createUrlMappings,
    ],
  );
};
import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';

export type EnvironmentCopy = components['schemas']['EnvironmentCopy'];
export type Environment = components['schemas']['EnvironmentRead'];

type CreateEnvironmentParams = {
  name: string;
  key: string;
  description?: string;
  settings?: Record<string, never>;
};

export const useEnvironmentApi = () => {
  const { authenticatedApiClient } = useClient();

  const getEnvironments = useCallback(async () => {
    return await authenticatedApiClient().GET('/v2/projects/{proj_id}/envs');
  }, [authenticatedApiClient]);

  const getEnvironment = useCallback(async (environmentId: string) => {
    return await authenticatedApiClient().GET('/v2/projects/{proj_id}/envs/{env_id}', {
      env_id: environmentId
    });
  }, [authenticatedApiClient]);

  const copyEnvironment = useCallback(async (envId: string, body: EnvironmentCopy) => {
    return await authenticatedApiClient().POST(
      '/v2/projects/{proj_id}/envs/{env_id}/copy',
      { env_id: envId },
      body
    );
  }, [authenticatedApiClient]);

  const createEnvironment = useCallback(async (params: CreateEnvironmentParams) => {
    return await authenticatedApiClient().POST(
      '/v2/projects/{proj_id}/envs',
      undefined, // proj_id is auto-injected
      params
    );
  }, [authenticatedApiClient]);

  const deleteEnvironment = useCallback(async (environmentId: string) => {
    return await authenticatedApiClient().DELETE(
      '/v2/projects/{proj_id}/envs/{env_id}',
      { env_id: environmentId },
      undefined,
      undefined
    );
  }, [authenticatedApiClient]);

  return useMemo(
    () => ({
      getEnvironments,
      getEnvironment,
      copyEnvironment,
      createEnvironment,
      deleteEnvironment,
    }),
    [
      getEnvironments,
      getEnvironment,
      copyEnvironment,
      createEnvironment,
      deleteEnvironment,
    ]
  );
};
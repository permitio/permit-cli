import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';
import { components } from '../lib/api/v1.js';

export type CreateTenantBody = components['schemas']['TenantCreate'];
export type CreateUserBody = components['schemas']['UserCreate'];

export const useTenantApi = () => {
	const { authenticatedApiClient } = useClient();
	const createTenant = useCallback(
		async (body: CreateTenantBody) => {
			return await authenticatedApiClient().POST(
				'/v2/facts/{proj_id}/{env_id}/tenants',
				undefined,
				body,
			);
		},
		[authenticatedApiClient],
	);

	const createAndAddUsers = useCallback(
		async (tenant_id: string, body: CreateUserBody) => {
			return await authenticatedApiClient().POST(
				'/v2/facts/{proj_id}/{env_id}/tenants/{tenant_id}/users',
				{ tenant_id },
				body,
			);
		},
		[authenticatedApiClient],
	);
	return useMemo(
		() => ({
			createTenant,
			createAndAddUsers,
		}),
		[createTenant, createAndAddUsers],
	);
};

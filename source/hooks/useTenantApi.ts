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

	return useMemo(
		() => ({
			createTenant,
		}),
		[createTenant],
	);
};

import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';
import { components } from '../lib/api/v1.js';

export type CreateUserBody = components['schemas']['UserCreate'];

export const useUserApi = () => {
	const { authenticatedApiClient } = useClient();

	const createUser = useCallback(
		async (body: CreateUserBody) => {
			return await authenticatedApiClient().POST(
				'/v2/facts/{proj_id}/{env_id}/users',
				undefined,
				body,
			);
		},
		[authenticatedApiClient],
	);
	return useMemo(
		() => ({
			createUser,
		}),
		[createUser],
	);
};

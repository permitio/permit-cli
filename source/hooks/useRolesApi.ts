import useClient from './useClient.js';
import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';

export type RoleRead = components['schemas']['RoleRead'];
export type RoleAssignmentCreate =
	components['schemas']['RoleAssignmentCreate'];

export const useRolesApi = () => {
	const { authenticatedApiClient } = useClient();
	const getRoles = useCallback(async () => {
		return await authenticatedApiClient().GET(
			'/v2/schema/{proj_id}/{env_id}/roles',
			undefined,
			undefined,
			{ per_page: 100 },
		);
	}, [authenticatedApiClient]);

	const assignRoles = useCallback(
		async (body: RoleAssignmentCreate[]) => {
			return await authenticatedApiClient().POST(
				'/v2/facts/{proj_id}/{env_id}/role_assignments/bulk',
				undefined,
				body,
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getRoles,
			assignRoles,
		}),
		[getRoles, assignRoles],
	);
};

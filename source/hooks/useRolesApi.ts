import useClient from './useClient.js';
import { useCallback, useMemo, useState } from 'react';
import { components } from '../lib/api/v1.js';

export type RoleRead = components['schemas']['RoleRead'];
export type RoleAssignmentCreate =
	components['schemas']['RoleAssignmentCreate'];

export const useRolesApi = () => {
	const { authenticatedApiClient } = useClient();
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'done' | 'error'
	>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const getRoles = useCallback(async () => {
		return await authenticatedApiClient().GET(
			'/v2/schema/{proj_id}/{env_id}/roles',
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

	const getExistingRoles = useCallback(async () => {
		try {
			const client = authenticatedApiClient();
			const { data, error } = await client.GET(
				`/v2/schema/{proj_id}/{env_id}/roles`,
			);

			if (error) throw new Error(error);
			const rolesData = data;

			let rolesArray: { key: string }[] = [];

			if (Array.isArray(rolesData)) {
				// Case: RoleRead[]
				rolesArray = rolesData;
			} else if (Array.isArray(rolesData?.data)) {
				// Case: PaginatedResult_RoleRead_
				rolesArray = rolesData.data;
			} else {
				setErrorMessage('Invalid roles response format');
				return new Set();
			}

			return new Set(rolesArray.map(r => r.key));
		} catch (error) {
			setErrorMessage((error as Error).message);
			return new Set();
		}
	}, [authenticatedApiClient]);

	const createBulkRoles = useCallback(
		async (roles: components['schemas']['RoleCreate'][]) => {
			setStatus('processing');
			setErrorMessage(null);

			try {
				const client = authenticatedApiClient();

				for (const role of roles) {
					const { error } = await client.POST(
						`/v2/schema/{proj_id}/{env_id}/roles`,

						role,
					);

					if (error) throw new Error(error);
				}

				setStatus('done');
			} catch (error) {
				setStatus('error');
				setErrorMessage((error as Error).message);
				throw error;
			}
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getRoles,
			assignRoles,
			getExistingRoles,
			createBulkRoles,
			status,
			errorMessage,
		}),
		[
			getRoles,
			assignRoles,
			getExistingRoles,
			createBulkRoles,
			status,
			errorMessage,
		],
	);
};

import { useCallback, useState } from 'react';
import useClient from './useClient.js';
import type { RoleDefinition } from '../lib/policy/utils.js';

export function useRolesApi(
	projectId: string | undefined,
	environmentId: string | undefined,
	apiKey?: string,
) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'done' | 'error'
	>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const getExistingRoles = useCallback(async () => {
		try {
			const client = apiKey
				? unAuthenticatedApiClient(apiKey)
				: authenticatedApiClient();
			const { data, error } = await client.GET(
				`/v2/schema/{proj_id}/{env_id}/roles`,
				{
					proj_id: projectId as string,
					env_id: environmentId as string,
				},
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
	}, [projectId, environmentId, apiKey]);

	const createBulkRoles = useCallback(
		async (roles: RoleDefinition[]) => {
			setStatus('processing');
			setErrorMessage(null);

			try {
				const client = apiKey
					? unAuthenticatedApiClient(apiKey)
					: authenticatedApiClient();

				for (const role of roles) {
					const { error } = await client.POST(
						`/v2/schema/{proj_id}/{env_id}/roles`,
						{
							proj_id: projectId as string,
							env_id: environmentId as string,
						},
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
		[projectId, environmentId, apiKey],
	);

	return {
		createBulkRoles,
		getExistingRoles,
		status,
		errorMessage,
	};
}

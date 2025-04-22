import useClient from './useClient.js';
import { useCallback, useMemo, useState } from 'react';
import { components } from '../lib/api/v1.js';

export type AssignRole = components['schemas']['RoleAssignmentCreate'];

export const useAssignRoleApi = () => {
	const { authenticatedApiClient } = useClient();
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'done' | 'error'
	>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const assignBulkRoles = useCallback(
		async (assignRoles: AssignRole[]) => {
			setStatus('processing');
			const client = authenticatedApiClient();
			const { error } = await client.POST(
				`/v2/facts/{proj_id}/{env_id}/role_assignments/bulk`,
				undefined,
				assignRoles,
				undefined,
			);
			if (error) {
				setErrorMessage(error);
				setStatus('error');
				return;
			}
			setStatus('done');
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			assignBulkRoles,
			status,
			errorMessage,
		}),
		[assignBulkRoles, status, errorMessage],
	);
};

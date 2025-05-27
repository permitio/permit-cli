import useClient from './useClient.js';
import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';

export type ConditionSetRuleRead =
	components['schemas']['ConditionSetRuleRead'];

export const useSetPermissionsApi = () => {
	const { authenticatedApiClient } = useClient();

	const getSetPermissions = useCallback(async () => {
		return await authenticatedApiClient().GET(
			'/v2/facts/{proj_id}/{env_id}/set_rules',
		);
	}, [authenticatedApiClient]);

	return useMemo(
		() => ({
			getSetPermissions,
		}),
		[getSetPermissions],
	);
};

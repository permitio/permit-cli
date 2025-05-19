import useClient from './useClient.js';
import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';

export type ConditionSetType = components['schemas']['ConditionSetType'];
export type ConditionSetRead = components['schemas']['ConditionSetRead'];

export const useConditionSetApi = () => {
	const { authenticatedApiClient } = useClient();

	const getConditionSets = useCallback(
		async (type: ConditionSetType) => {
			return await authenticatedApiClient().GET(
				'/v2/schema/{proj_id}/{env_id}/condition_sets',
				undefined,
				undefined,
				{ type },
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getConditionSets,
		}),
		[getConditionSets],
	);
};

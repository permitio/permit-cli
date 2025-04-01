import { useCallback } from 'react';
import useClient from './useClient.js';

export default function useGitOpsCloneApi() {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	const fetchActivePolicyRepo = useCallback(
		async (projectId: string, apiKey?: string): Promise<string | null> => {
			const client = apiKey
				? unAuthenticatedApiClient(apiKey)
				: authenticatedApiClient();
			const { data, error } = await client.GET(
				`/v2/projects/{proj_id}/repos/active`,
				{ proj_id: projectId },
			);
			if (error) {
				throw new Error(`Failed to fetch Active policy Repository: ${error}`);
			}
			if (data) {
				return data.url;
			}
			return null;
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);
	return { fetchActivePolicyRepo };
}

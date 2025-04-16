// File: hooks/useListProxy.ts
import { useCallback, useState } from 'react';
import useClient from './useClient.js';

export type ProxyConfig = {
	key: string;
	id: string;
	organization_id: string;
	project_id: string;
	environment_id: string;
	created_at: string;
	updated_at: string;
	secret: string;
	name: string;
	mapping_rules: any[]; // Enhance this type as needed.
	auth_mechanism: 'Bearer' | 'Basic' | 'Headers';
};

type ListStatus = 'processing' | 'done' | 'error';

export function useListProxy(
	projectId: string | undefined,
	environmentId: string | undefined,
	apiKey?: string,
	initialPage: number = 1,
	perPage: number = 30
) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const [status, setStatus] = useState<ListStatus>('processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [proxies, setProxies] = useState<ProxyConfig[]>([]);
	const [page, setPage] = useState<number>(initialPage);

	const listProxies = useCallback(async () => {
		if (!projectId || !environmentId) {
			setErrorMessage('Project ID or Environment ID is missing');
			setStatus('error');
			return;
		}
		setStatus('processing');
		try {
			const apiClient = apiKey
				? unAuthenticatedApiClient(apiKey)
				: authenticatedApiClient();

			// Pass path parameters in the second argument and query parameters in the fourth argument.
			const result = await apiClient.GET(
				'/v2/facts/{proj_id}/{env_id}/proxy_configs',
				{ proj_id: projectId, env_id: environmentId },
				undefined,
				{ page, per_page: perPage }
			);

			if (result.error) {
				console.error('API Error:', result.error);
				setErrorMessage(
					typeof result.error === 'object' &&
						result.error !== null &&
						'message' in result.error
						? (result.error as { message: string }).message
						: result.error || 'Unknown error'
				);
				setStatus('error');
				return;
			}

			// Use the parsed data as returned by the client.
			if (result.response.status >= 200 && result.response.status < 300) {
				// Here we mimic the pattern used in your Graph Data hook:
				// The API response may be an array or included in a data property.
				const data = Array.isArray(result.data)
					? result.data
					: result.data || [];
				setProxies(
					data.map((item) => ({
						...item,
						secret: typeof item.secret === 'string' ? item.secret : JSON.stringify(item.secret),
					}))
				);
				setStatus('done');
			} else {
				setErrorMessage(`Unexpected API status code: ${result.response.status}`);
				setStatus('error');
			}
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : String(error));
			setStatus('error');
		}
	}, [
		apiKey,
		authenticatedApiClient,
		environmentId,
		page,
		perPage,
		projectId,
		unAuthenticatedApiClient,
	]);

	return { status, errorMessage, proxies, listProxies, setPage };
}

export default useListProxy;

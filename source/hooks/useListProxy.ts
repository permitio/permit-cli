import { useCallback, useState } from 'react';
import useClient from './useClient.js';
import { ProxyConfigOptions } from '../utils/api/proxy/createutils.js';

type ListStatus = 'processing' | 'done' | 'error';

interface RawMappingRule {
	url: string;
	url_type?: string;
	http_method: 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
	resource?: string;
	headers?: Record<string, string>;
	action?: string;
	priority?: number;
}

interface RawProxyConfig {
	key: string;
	secret: unknown;
	name: string;
	mapping_rules?: RawMappingRule[];
	auth_mechanism: 'Bearer' | 'Basic' | 'Headers';
}

export function useListProxy(initialPage: number = 1, perPage: number = 30) {
	const { authenticatedApiClient } = useClient();
	const [status, setStatus] = useState<ListStatus>('processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [proxies, setProxies] = useState<ProxyConfigOptions[]>([]);
	const [totalCount, setTotalCount] = useState<number>(0);
	const [page, setPage] = useState<number>(initialPage);

	const listProxies = useCallback(
		async (fetchAll: boolean = false) => {
			setStatus('processing');
			try {
				const apiClient = authenticatedApiClient();

				let allProxies: RawProxyConfig[] = [];
				let currentPage = page;

				do {
					const result = await apiClient.GET(
						'/v2/facts/{proj_id}/{env_id}/proxy_configs',
						{},
						undefined,
						{ page: currentPage, per_page: perPage },
					);

					if (result.error) {
						console.error('API Error:', result.error);
						setErrorMessage(
							typeof result.error === 'object' &&
								result.error !== null &&
								'message' in result.error
								? (result.error as { message: string }).message
								: result.error || 'Unknown error',
						);
						setStatus('error');
						return;
					}

					if (result.response.status >= 200 && result.response.status < 300) {
						const data: RawProxyConfig[] = Array.isArray(result.data)
							? result.data
							: result.data || [];

						allProxies = [...allProxies, ...data];

						if (!fetchAll || data.length < perPage) break;

						currentPage++;
					} else {
						setErrorMessage(
							`Unexpected API status code: ${result.response.status}`,
						);
						setStatus('error');
						return;
					}
				} while (fetchAll);

				setProxies(
					allProxies.map((item: RawProxyConfig) => ({
						key: item.key,
						secret:
							typeof item.secret === 'string'
								? item.secret
								: JSON.stringify(item.secret),
						name: item.name,
						mapping_rules: Array.isArray(item.mapping_rules)
							? item.mapping_rules.map(rule => ({
									url: rule.url,
									url_type: rule.url_type === 'regex' ? 'regex' : undefined,
									http_method: rule.http_method,
									resource: rule.resource || '',
									headers: rule.headers || {},
									action: rule.action,
									priority: rule.priority,
								}))
							: [],
						auth_mechanism: item.auth_mechanism,
					})),
				);
				setTotalCount(allProxies.length);
				setStatus('done');
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : String(error));
				setStatus('error');
			}
		},
		[authenticatedApiClient, page, perPage],
	);

	return { status, errorMessage, proxies, totalCount, listProxies, setPage };
}

export default useListProxy;

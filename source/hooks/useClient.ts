import type { paths } from '../lib/api/v1.js';
import { CLOUD_PDP_URL, PERMIT_API_URL, PERMIT_ORIGIN_URL } from '../config.js';
import type { paths as PdpPaths } from '../lib/api/pdp-v1.js';

import createClient, {
	Client,
	FetchResponse,
	MaybeOptionalInit,
} from 'openapi-fetch';
import type { PathsWithMethod } from 'openapi-typescript-helpers';
import { ApiKeyScope } from './useApiKeyApi.js';
import { useCallback, useMemo } from 'react';

export const globalTokenGetterSetter = (() => {
	let authToken: string | null = null;

	return {
		tokenGetter: () => authToken,
		tokenSetter: (token: string) => {
			authToken = token;
		},
	};
})();

export const globalScopeGetterSetter = (() => {
	let scope: ApiKeyScope | null = null;

	return {
		scopeGetter: () => scope,
		scopeSetter: (_scope: ApiKeyScope) => {
			scope = _scope;
		},
	};
})();

const useClient = () => {
	const _getMethods = (client: Client<paths, `${string}/${string}`>) => {
		const GET = async <
			Path extends PathsWithMethod<paths, 'get'>,
			Init extends MaybeOptionalInit<paths[Path], 'get'>,
		>(
			path: Path,
			path_values?: Omit<
				paths[Path]['get']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body?: paths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: paths[Path]['get']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['get'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.GET(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : error.detail.toString();
			}
			return { data, response, error: newError };
		};

		const POST = async <
			Path extends PathsWithMethod<paths, 'post'>,
			Init extends MaybeOptionalInit<paths[Path], 'post'>,
		>(
			path: Path,

			path_values?: Omit<
				paths[Path]['post']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body?: paths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: paths[Path]['post']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['post'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.POST(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		const DELETE = async <
			Path extends PathsWithMethod<paths, 'delete'>,
			Init extends MaybeOptionalInit<paths[Path], 'delete'>,
		>(
			path: Path,
			path_values: Omit<
				paths[Path]['delete']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body: paths[Path]['delete']['requestBody'],
			query: paths[Path]['delete']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['delete'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.DELETE(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		return {
			GET,
			POST,
			DELETE,
		};
	};

	const authenticatedApiClient = useCallback(() => {
		const client = createClient<paths>({
			baseUrl: PERMIT_API_URL,
			headers: {
				Accept: '*/*',
				Origin: PERMIT_ORIGIN_URL,
				'Content-Type': 'application/json',
				Authorization: `Bearer ${globalTokenGetterSetter.tokenGetter()}`,
			},
		});
		return _getMethods(client);
	}, []);

	const authenticatedPdpClient = useCallback((pdp_url?: string) => {
		const client = createClient<PdpPaths>({
			baseUrl: pdp_url ?? CLOUD_PDP_URL,
			headers: {
				Accept: '*/*',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${globalTokenGetterSetter.tokenGetter()}`,
			},
		});

		const GET = async <
			Path extends PathsWithMethod<PdpPaths, 'get'>,
			Init extends MaybeOptionalInit<PdpPaths[Path], 'get'>,
		>(
			path: Path,
			path_values?: Omit<
				PdpPaths[Path]['get']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body?: PdpPaths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: PdpPaths[Path]['get']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<PdpPaths[Path]['get'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.GET(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		const POST = async <
			Path extends PathsWithMethod<PdpPaths, 'post'>,
			Init extends MaybeOptionalInit<PdpPaths[Path], 'post'>,
		>(
			path: Path,

			path_values?: Omit<
				PdpPaths[Path]['post']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body?: PdpPaths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: PdpPaths[Path]['post']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<PdpPaths[Path]['post'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.POST(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		const DELETE = async <
			Path extends PathsWithMethod<PdpPaths, 'delete'>,
			Init extends MaybeOptionalInit<PdpPaths[Path], 'delete'>,
		>(
			path: Path,

			path_values: Omit<
				PdpPaths[Path]['delete']['parameters']['path'],
				'proj_id' | 'org_id' | 'env_id'
			>,
			body: PdpPaths[Path]['delete']['requestBody'],
			query: PdpPaths[Path]['delete']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<PdpPaths[Path]['delete'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			const globalScope = globalScopeGetterSetter.scopeGetter();

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.DELETE(path, {
				params: {
					query: query ?? undefined,
					path: path_values
						? {
								...{
									org_id: globalScope?.organization_id,
									proj_id: globalScope?.project_id,
									env_id: globalScope?.environment_id,
								},
								...path_values,
							}
						: {
								org_id: globalScope?.organization_id,
								proj_id: globalScope?.project_id,
								env_id: globalScope?.environment_id,
							},
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		return {
			GET,
			POST,
			DELETE,
		};
	}, []);

	const unAuthenticatedApiClient = (
		accessToken?: string | null,
		cookie?: string | null,
	) => {
		const client = createClient<paths>({
			baseUrl: PERMIT_API_URL,
			headers: {
				Accept: '*/*',
				Origin: PERMIT_ORIGIN_URL,
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
				Cookie: cookie,
			},
		});

		const GET = async <
			Path extends PathsWithMethod<paths, 'get'>,
			Init extends MaybeOptionalInit<paths[Path], 'get'>,
		>(
			path: Path,
			path_values?: paths[Path]['get']['parameters']['path'],
			body?: paths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: paths[Path]['get']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['get'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.GET(path, {
				params: {
					query: query ?? undefined,
					path: path_values ?? undefined,
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		const POST = async <
			Path extends PathsWithMethod<paths, 'post'>,
			Init extends MaybeOptionalInit<paths[Path], 'post'>,
		>(
			path: Path,

			path_values?: paths[Path]['post']['parameters']['path'],

			body?: paths[Path]['post'] extends {
				requestBody: { content: { 'application/json': infer B } };
			}
				? B
				: undefined,
			query?: paths[Path]['post']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['post'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.POST(path, {
				params: {
					query: query ?? undefined,
					path: path_values ?? undefined,
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		const DELETE = async <
			Path extends PathsWithMethod<paths, 'delete'>,
			Init extends MaybeOptionalInit<paths[Path], 'delete'>,
		>(
			path: Path,

			path_values: paths[Path]['delete']['parameters']['path'],

			body: paths[Path]['delete']['requestBody'],
			query: paths[Path]['delete']['parameters']['query'],
		): Promise<
			Omit<
				FetchResponse<paths[Path]['delete'], Init, 'application/json'>,
				'error'
			> & { error: string | null }
		> => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			const { data, response, error } = await client.DELETE(path, {
				params: {
					query: query ?? undefined,
					path: path_values ?? undefined,
				},
				body: body ?? undefined, // Only include if body exists
			});
			let newError: string | null = null;
			if (error) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				newError = error instanceof String ? error : JSON.stringify(error);
			}
			return { data, response, error: newError };
		};

		return {
			GET,
			POST,
			DELETE,
		};
	};

	return useMemo(
		() => ({
			authenticatedApiClient,
			authenticatedPdpClient,
			unAuthenticatedApiClient,
		}),
		[authenticatedApiClient, authenticatedPdpClient],
	);
};

export default useClient;

import { useCallback, useState } from 'react';
import useClient from './useClient.js';
import {
	ProxyConfigOptions,
	validateProxyConfig,
} from '../utils/api/proxy/createutils.js';

type CreateStatus = 'idle' | 'processing' | 'done' | 'error' | 'input';

export function useCreateProxy(
	projectId: string | undefined,
	environmentId: string | undefined,
	apiKey?: string,
) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const [status, setStatus] = useState<CreateStatus>('processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleApiError = useCallback(
		(error: unknown, defaultMessage = 'API Error') => {
			try {
				const errorObj =
					typeof error === 'string'
						? JSON.parse(error)
						: (error as { message?: string });
				if (errorObj?.message) {
					setErrorMessage(errorObj.message);
				} else {
					setErrorMessage(`${defaultMessage}: ${JSON.stringify(errorObj)}`);
				}
			} catch (err) {
				setErrorMessage(`${defaultMessage}: ${String(err)}`);
			}
			setStatus('error');
		},
		[],
	);

	const handleCatchError = useCallback((error: unknown) => {
		setErrorMessage(error instanceof Error ? error.message : String(error));
		setStatus('error');
	}, []);

	const createProxy = useCallback(
		async (payload: ProxyConfigOptions) => {
			if (!projectId || !environmentId) {
				setErrorMessage('Project ID or Environment ID is missing');
				setStatus('error');
				return;
			}

			// Validate the payload using our unified util.
			try {
				validateProxyConfig(payload);
			} catch (validationError) {
				setErrorMessage(
					validationError instanceof Error
						? validationError.message
						: String(validationError),
				);
				setStatus('error');
				return;
			}

			setStatus('processing');
			try {
				const apiClient = apiKey
					? unAuthenticatedApiClient(apiKey)
					: authenticatedApiClient();

				const result = await apiClient.POST(
					'/v2/facts/{proj_id}/{env_id}/proxy_configs',
					{ proj_id: projectId, env_id: environmentId },
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					{ ...payload, mapping_rules: payload.mapping_rules || [] },
					undefined,
				);

				// Handle validation errors (422)
				if (result.response.status === 422) {
					handleApiError(result.error, 'Validation Error: Invalid Payload');
					return;
				}

				if (result.response.status >= 200 && result.response.status < 300) {
					setStatus('done');
				} else {
					handleApiError(
						result.error,
						`Unexpected API status code: ${result.response.status}`,
					);
				}
			} catch (error) {
				handleCatchError(error);
			}
		},
		[
			apiKey,
			authenticatedApiClient,
			environmentId,
			projectId,
			handleApiError,
			handleCatchError,
			unAuthenticatedApiClient,
		],
	);

	const formatErrorMessage = useCallback((message: string) => {
		return message;
	}, []);

	return {
		status,
		errorMessage,
		createProxy,
		formatErrorMessage,
		setStatus,
		setErrorMessage,
	};
}

export default useCreateProxy;

import { useCallback, useState } from 'react';
import useClient from './useClient.js';
import {
	ProxyConfigOptions,
	validateProxyConfig,
} from '../utils/api/proxy/createutils.js';

type CreateStatus = 'idle' | 'processing' | 'done' | 'error' | 'input';

export function useCreateProxy() {
	const { authenticatedApiClient } = useClient();
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
				console.log('Creating proxy with payload:', payload);
				const result = await authenticatedApiClient().POST(
					'/v2/facts/{proj_id}/{env_id}/proxy_configs',
					{},
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					{ ...payload, mapping_rules: payload.mapping_rules || [] },
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
		[authenticatedApiClient, handleApiError, handleCatchError],
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

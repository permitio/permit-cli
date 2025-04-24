import { useCallback, useMemo } from 'react';
import { useAuth } from '../../components/AuthProvider.js';
import { ApiResponse, isDuplicateError } from '../../utils/openapiUtils.js';
import useClient from '../useClient.js';
import { components } from '../../lib/api/v1.js';

type ProxyConfigCreate = components['schemas']['ProxyConfigCreate'];
type ProxyConfigRead = components['schemas']['ProxyConfigRead'];
type MappingRule = components['schemas']['MappingRule'];

// Helper type guard to check if an object has a specific property
function hasProperty<K extends string>(
	obj: unknown,
	key: K,
): obj is { [P in K]: unknown } {
	return typeof obj === 'object' && obj !== null && key in obj;
}

interface ErrorWithResponse {
	response?: { status?: number };
	status?: number;
	error?: unknown;
	message?: unknown;
}
function isErrorWithResponse(err: unknown): err is ErrorWithResponse {
	return typeof err === 'object' && err !== null;
}

interface ErrorWithErrorDetails {
	error?: { detail?: unknown; message?: unknown } | string;
	message?: unknown;
}
function isErrorWithErrorDetails(err: unknown): err is ErrorWithErrorDetails {
	return typeof err === 'object' && err !== null;
}

/**
 * Hook for URL mapping (Proxy Config) API operations using useClient
 */
export const usePermitUrlMappingApi = () => {
	useAuth();
	const { authenticatedApiClient } = useClient();

	/**
	 * Generic error handler using unknown
	 */
	const handleError = <T>(
		_operation: string,
		error: unknown,
	): ApiResponse<T> => {
		let status: number | undefined;
		let message = 'An unknown error occurred';
		let errorDetails: unknown = error;

		if (isErrorWithResponse(error)) {
			status = error.response?.status ?? error.status;
			errorDetails = error.error ?? error.message ?? error;
		}

		if (typeof errorDetails === 'string') {
			message = errorDetails;
			// Attempt to parse if it looks like JSON string
			if (message.startsWith('{') && message.endsWith('}')) {
				try {
					const parsed = JSON.parse(message);
					message = parsed.detail || parsed.message || message;
				} catch {
					/* Ignore parsing error */
				}
			}
		} else if (isErrorWithErrorDetails(errorDetails)) {
			if (typeof errorDetails.error === 'string') {
				message = errorDetails.error;
			} else if (
				hasProperty(errorDetails.error, 'detail') &&
				typeof errorDetails.error.detail === 'string'
			) {
				message = errorDetails.error.detail;
			} else if (
				hasProperty(errorDetails.error, 'message') &&
				typeof errorDetails.error.message === 'string'
			) {
				message = errorDetails.error.message;
			} else if (typeof errorDetails.message === 'string') {
				message = errorDetails.message;
			} else {
				message = JSON.stringify(errorDetails); // Fallback stringify
			}
		} else if (error instanceof Error) {
			message = error.message; // Standard Error object message
		} else {
			try {
				message = JSON.stringify(error);
			} catch {
				/* Fallback */
			}
		}

		// Check for duplicate error conditions
		if (isDuplicateError(error) || status === 409) {
			return {
				success: false,
				error: `Duplicate detected: ${message}`,
				status: 409,
			};
		}

		return { success: false, error: message, status };
	};

	/**
	 * Delete existing URL mappings (Proxy Config) by key
	 */
	const deleteUrlMappings = useCallback(
		async (proxyConfigKey: string): Promise<ApiResponse<null>> => {
			const path =
				'/v2/facts/{proj_id}/{env_id}/proxy_configs/{proxy_config_id}';
			const pathParams = { proxy_config_id: proxyConfigKey };
			try {
				const { error, response } = await authenticatedApiClient().DELETE(
					path,
					pathParams,
					undefined,
					undefined,
				);
				if (response?.status === 204) {
					return { success: true, data: null, error: null, status: 204 };
				}
				// Pass the raw error object (which might be null) to handleError
				if (error !== null)
					return handleError(`deleteUrlMappings (${proxyConfigKey})`, {
						error,
						response,
					});
				// If error is null but status isn't 204, treat as unexpected success
				return {
					success: true,
					data: null,
					error: null,
					status: response.status,
				};
			} catch (err) {
				// Handle specific fetch/network errors if needed
				if (
					err instanceof Error &&
					err.message.includes('Unexpected end of JSON input')
				) {
					// Assume 204 if JSON parsing fails on DELETE
					return { success: true, data: null, error: null, status: 204 };
				}
				return handleError(`deleteUrlMappings (${proxyConfigKey})`, err); // Handle other exceptions
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Creates URL mappings (Proxy Config) for the Permit proxy
	 */
	const createUrlMappings = useCallback(
		async (
			mappings: MappingRule[],
			authMechanism: string,
			secret: string | Record<string, string>,
		): Promise<ApiResponse<ProxyConfigRead>> => {
			const path = '/v2/facts/{proj_id}/{env_id}/proxy_configs';

			const body: ProxyConfigCreate = {
				key: 'openapi',
				name: 'OpenAPI Generated Mappings',
				mapping_rules: mappings,
				auth_mechanism: authMechanism as ProxyConfigCreate['auth_mechanism'],
				secret: secret as ProxyConfigCreate['secret'],
			};

			try {
				const { data, error, response } = await authenticatedApiClient().POST(
					path,
					undefined,
					body,
				);
				const status = response?.status;
				// Pass the raw error object (which might be null) to handleError
				if (error !== null)
					return handleError(`createUrlMappings`, { error, response });
				return { success: true, data, error: null, status };
			} catch (err) {
				return handleError(`createUrlMappings`, err); // Handle exceptions
			}
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			deleteUrlMappings,
			createUrlMappings,
		}),
		[deleteUrlMappings, createUrlMappings],
	);
};

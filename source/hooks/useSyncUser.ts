import { useCallback, useState } from 'react';
import { validate, UserSyncOptions } from '../utils/api/user/utils.js';
import useClient from '../hooks/useClient.js';

// Define a type for API errors
interface ApiError {
	message?: string;
	detail?: Array<{ msg?: string }>;
	[key: string]: unknown;
}

type SyncStatus = 'idle' | 'processing' | 'done' | 'error' | 'input';

export function useSyncUser(
	projectId: string | undefined,
	environmentId: string | undefined,
	apiKey?: string,
) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	const [status, setStatus] = useState<SyncStatus>('processing');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Helper function to handle API errors - defined before use
	const handleApiError = useCallback(
		(error: unknown, defaultMessage = 'API Error') => {
			try {
				const errorObj =
					typeof error === 'string'
						? (JSON.parse(error) as ApiError)
						: (error as ApiError);

				if (errorObj?.detail && Array.isArray(errorObj.detail)) {
					setErrorMessage(
						`Validation Error: ${
							errorObj.detail[0]?.msg || JSON.stringify(errorObj.detail)
						}`,
					);
				} else {
					setErrorMessage(
						errorObj?.message ||
							`${defaultMessage}: ${JSON.stringify(errorObj)}`,
					);
				}
			} catch (error) {
				setErrorMessage(`${defaultMessage}: ${String(error)}`);
			}

			setStatus('error');
		},
		[],
	);

	// Helper function to handle caught exceptions
	const handleCatchError = useCallback(
		(error: unknown) => {
			if (error && typeof error === 'object' && 'error' in error) {
				const errorObj = error as { error: unknown };
				handleApiError(errorObj.error);
			} else {
				setErrorMessage(error instanceof Error ? error.message : String(error));
				setStatus('error');
			}
		},
		[handleApiError],
	);

	const syncUser = useCallback(
		async (userId: string, payload: UserSyncOptions) => {
			if (!projectId || !environmentId) {
				setErrorMessage('Project ID or Environment ID is missing');
				setStatus('error');
				return;
			}

			try {
				setStatus('processing');

				// Validate the payload
				if (!validate(payload)) {
					setErrorMessage('Validation Error: Invalid user ID');
					setStatus('error');
					return;
				}

				// Get the appropriate API client
				const apiClient = apiKey
					? unAuthenticatedApiClient(apiKey)
					: authenticatedApiClient();

				const result = await apiClient.PUT(
					'/v2/facts/{proj_id}/{env_id}/users/{user_id}',
					{
						proj_id: projectId,
						env_id: environmentId,
						user_id: userId,
					},
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					{
						key: payload.key,
						email: payload.email,
						first_name: payload.firstName,
						last_name: payload.lastName,
						attributes: payload.attributes as Record<string, never>,
						role_assignments: payload.roleAssignments,
					},
					undefined,
				);

				// Handle validation errors (422)
				if (result.response.status === 422) {
					handleApiError(result.error, 'Validation Error: Invalid Payload');
					return;
				}

				// Handle other errors
				if (result.error) {
					handleApiError(result.error);
					return;
				}

				// Check for successful response
				if (result.response.status >= 200 && result.response.status < 300) {
					setStatus('done');
				} else {
					setErrorMessage(
						`API Error: Unexpected status code ${result.response.status}`,
					);
					setStatus('error');
				}
			} catch (error) {
				handleCatchError(error);
			}
		},
		[
			apiKey,
			authenticatedApiClient,
			unAuthenticatedApiClient,
			projectId,
			environmentId,
			handleApiError,
			handleCatchError,
		],
	);

	// Format error message for better readability
	const formatErrorMessage = useCallback((message: string) => {
		if (message.includes("could not find 'Tenant'")) {
			const tenantMatch = message.match(/id='([^']+)'/);
			const tenantId = tenantMatch ? tenantMatch[1] : 'unknown';
			return `Tenant not found: '${tenantId}'. Please create this tenant before assigning roles to it.`;
		}
		return message;
	}, []);

	return {
		status,
		errorMessage,
		syncUser,
		formatErrorMessage,
		setStatus,
		setErrorMessage,
	};
}

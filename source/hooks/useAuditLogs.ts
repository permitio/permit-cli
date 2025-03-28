import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';
import { fetchUtil, MethodE } from '../utils/fetchUtil.js';
import { apiCall } from '../lib/api.js';
import { loadAuthToken } from '../lib/auth.js';

// Type definitions
export interface AuditLog {
	id: string;
	timestamp: string;
	user_key?: string;
	user_email?: string;
	resource?: string;
	resource_type?: string;
	action: string;
	tenant: string | null;
	decision: boolean;
	pdp_config_id?: string;
}

export interface AuditContext {
	user: {
		id: string;
		key?: string;
		attributes?: Record<string, string | number | boolean>;
	};
	resource: {
		type: string;
		id: string;
		attributes?: Record<string, string | number | boolean>;
	};
	tenant: string;
	action: string;
}

export interface DetailedAuditLog extends AuditLog {
	user_id: string;
	context?: AuditContext;
}

export interface FilterOptions {
	timeFrame: number;
	sourcePdp?: string;
	users?: string[];
	resources?: string[];
	tenant?: string;
	action?: string;
	decision?: boolean;
}

type QueryParamValue = string | number | boolean | string[];

/**
 * Builds a query string, correctly handling arrays
 */
const buildQueryString = (params: Record<string, QueryParamValue>): string => {
	return Object.entries(params)
		.flatMap(([key, value]) => {
			if (Array.isArray(value)) {
				return value.map(v => `${key}=${encodeURIComponent(String(v))}`);
			}
			return `${key}=${encodeURIComponent(String(value))}`;
		})
		.join('&');
};

/**
 * Hook for interacting with audit logs and PDP checking functionality
 */
export const useAuditLogs = () => {
	const { authenticatedApiClient } = useClient();

	/**
	 * Fetches audit logs based on filters
	 */
	const getAuditLogs = useCallback(
		async (filters: FilterOptions) => {
			// Calculate date range
			const endDate = new Date();
			const startDate = new Date(
				endDate.getTime() - filters.timeFrame * 60 * 60 * 1000,
			);

			// Get current scope
			const { data: scope, error: scopeError } =
				await authenticatedApiClient().GET('/v2/api-key/scope');

			if (scopeError || !scope) {
				return { data: null, error: scopeError || 'Failed to get API scope' };
			}

			// Prepare query parameters
			const queryParams: Record<string, QueryParamValue> = {
				timestamp_from: Math.floor(startDate.getTime() / 1000),
				timestamp_to: Math.floor(endDate.getTime() / 1000),
				page: 1,
				per_page: 100,
				sort_by: 'timestamp',
			};

			// Add optional filters
			if (filters.sourcePdp) queryParams['pdp_id'] = filters.sourcePdp;
			if (filters.users && filters.users.length > 0)
				queryParams['users'] = filters.users;
			if (filters.resources && filters.resources.length > 0)
				queryParams['resources'] = filters.resources;
			if (filters.tenant) queryParams['tenant'] = filters.tenant;
			if (filters.action) queryParams['action'] = filters.action;
			if (filters.decision !== undefined)
				queryParams['decision'] = filters.decision;

			// Build query string
			const queryString = buildQueryString(queryParams);

			// Get auth token
			const token = await loadAuthToken();

			// Use direct apiCall to match the original implementation exactly
			const { response, error, status } = await apiCall(
				`v2/pdps/${scope.project_id}/${scope.environment_id}/audit_logs?${queryString}`,
				token,
			);

			if (error) {
				if (status === 404) {
					return {
						data: null,
						error:
							'Failed to fetch audit logs: The audit logs API endpoint was not found.',
					};
				} else {
					return {
						data: null,
						error: `Failed to fetch audit logs: ${error}`,
					};
				}
			}

			return { data: response, error: null };
		},
		[authenticatedApiClient],
	);

	/**
	 * Fetches detailed information for a specific audit log
	 */
	const getAuditLogDetails = useCallback(
		async (auditLogId: string) => {
			// Get current scope
			const { data: scope, error: scopeError } =
				await authenticatedApiClient().GET('/v2/api-key/scope');

			if (scopeError || !scope) {
				return { data: null, error: scopeError || 'Failed to get API scope' };
			}

			// Make a direct API call to match original implementation
			const token = await loadAuthToken();
			const { response, error } = await apiCall(
				`v2/pdps/${scope.project_id}/${scope.environment_id}/audit_logs/${auditLogId}`,
				token,
			);

			return { data: response, error };
		},
		[authenticatedApiClient],
	);

	/**
	 * Performs an authorization check against a PDP
	 */
	const checkPdpPermission = useCallback(
		async (
			request: {
				tenant: string;
				action: string;
				user: { key: string };
				resource: { type: string; key?: string };
			},
			pdpUrl?: string,
		) => {
			// Direct API call to match original implementation
			const token = await loadAuthToken();

			const response = await fetchUtil(
				`${pdpUrl}/allowed`,
				MethodE.POST,
				token,
				{
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				{
					tenant: request.tenant,
					action: request.action,
					user: {
						key: request.user.key,
					},
					resource: request.resource,
					context: {},
				},
			);

			if (!response.success) {
				return {
					data: null,
					error: response.error || 'Unknown error during PDP check',
				};
			}

			return { data: response.data, error: null };
		},
		[],
	);

	return useMemo(
		() => ({
			getAuditLogs,
			getAuditLogDetails,
			checkPdpPermission,
		}),
		[getAuditLogs, getAuditLogDetails, checkPdpPermission],
	);
};

export default useAuditLogs;

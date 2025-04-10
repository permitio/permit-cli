import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';

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

/**
 * Hook for interacting with audit logs and PDP checking functionality
 */
export const useAuditLogs = () => {
	const { authenticatedApiClient, authenticatedPdpClient } = useClient();

	/**
	 * Fetches audit logs based on filters with pagination support
	 */
	const getAuditLogs = useCallback(
		async (filters: FilterOptions) => {
			try {
				// Calculate date range
				const endDate = new Date();
				const startDate = new Date(
					endDate.getTime() - filters.timeFrame * 60 * 60 * 1000,
				);

				// Prepare query parameters
				type QueryParamValue = string | number | boolean | string[];
				const queryParams: Record<string, QueryParamValue> = {
					timestamp_from: Math.floor(startDate.getTime() / 1000),
					timestamp_to: Math.floor(endDate.getTime() / 1000),
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

				// Start with page 1
				let currentPage = 1;
				let hasMorePages = true;
				const allLogs: unknown[] = [];
				const perPageValue = 100; // Store the per_page as a separate variable for comparison

				// Fetch all pages
				while (hasMorePages) {
					queryParams['page'] = currentPage;

					const { data, error } = await authenticatedApiClient().GET(
						'/v2/pdps/{proj_id}/{env_id}/audit_logs',
						undefined,
						undefined,
						queryParams,
					);

					if (error) {
						return { data: null, error };
					}

					// Check if we have valid data
					if (!data || !Array.isArray(data.data)) {
						return {
							data: null,
							error: 'Invalid response format for audit logs',
						};
					}

					// Add logs from this page to our collection
					allLogs.push(...data.data);

					// Check if we've reached the last page
					if (data.data.length < perPageValue) {
						hasMorePages = false;
					} else {
						currentPage++;
					}

					// For safety, limit to a reasonable number of pages
					if (currentPage > 10) {
						break;
					}
				}

				return {
					data: { data: allLogs },
					error: null,
				};
			} catch (err) {
				return {
					data: null,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		},
		[authenticatedApiClient],
	);

	/**
	 * Fetches detailed information for a specific audit log ID
	 */
	const getAuditLogDetails = useCallback(
		async (auditLogId: string) => {
			try {
				// Directly fetch a specific audit log by ID
				const { data, error } = await authenticatedApiClient().GET(
					'/v2/pdps/{proj_id}/{env_id}/audit_logs/{log_id}',
					{ log_id: auditLogId },
				);

				if (error) {
					return { data: null, error };
				}

				return { data, error: null };
			} catch (err) {
				return {
					data: null,
					error: err instanceof Error ? err.message : String(err),
				};
			}
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
			try {
				// Format the request according to PDP v2 API expectations
				const pdpRequest = {
					tenant: request.tenant,
					action: request.action,
					user: {
						key: request.user.key,
						firstName: undefined,
						lastName: undefined,
						email: undefined,
						attributes: {} as Record<string, never>,
					},
					resource: {
						type: request.resource.type,
						key: request.resource.key || '',
						tenant: request.tenant,
						attributes: {} as Record<string, never>,
						context: {} as Record<string, never>,
					},
					context: {} as Record<string, never>,
				};

				const { data, error } = await authenticatedPdpClient(pdpUrl).POST(
					'/allowed',
					undefined,
					pdpRequest,
				);

				if (error) {
					return {
						data: null,
						error: `PDP check failed: ${error}`,
					};
				}

				return { data, error: null };
			} catch (err) {
				return {
					data: null,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		},
		[authenticatedPdpClient],
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

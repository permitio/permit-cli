import { fetchUtil, MethodE } from './fetchUtil.js';
import type { AuthContextType } from '../components/AuthProvider.js';
import { FACTS_API_URL } from '../config.js';

type PermitApiOptions = {
	auth: AuthContextType;
	projectId?: string;
	envId?: string;
	apiKey?: string;
};

export async function permitApi<T>(
	endpoint: string,
	{ auth, projectId, envId, apiKey }: PermitApiOptions,
	method: MethodE = MethodE.GET,
	body?: object,
	queryParams?: Record<string, string>,
) {
	const baseUrl = `${FACTS_API_URL}${
		auth.scope.project_id || projectId
	}/${auth.scope.environment_id || envId}`;

	const url = new URL(`${baseUrl}/${endpoint}`);
	if (queryParams) {
		Object.entries(queryParams).forEach(([key, value]) => {
			if (value) url.searchParams.append(key, value);
		});
	}

	return fetchUtil<T>(
		url.toString(),
		method,
		auth.authToken || apiKey,
		undefined,
		body,
	);
}

// Core interfaces for API interactions - keep in sync with Permit.io OpenAPI spec
export interface UserData {
	key: string;
	email: string;
	first_name: string;
	last_name: string;
	roles: Array<{ role: string; tenant: string }>;
}

// Response interfaces mirror API contract - consider generating from OpenAPI
export interface ListUsersResponse {
	data: UserData[];
	total_count: number;
	page?: number;
}

export interface RoleAssignmentResponse {
	user: string;
	role: string;
	tenant: string;
}

// Request interfaces ensure type safety across all API calls
export interface ListUsersRequest extends PermitApiOptions {
	page?: number;
	perPage?: number;
	role?: string;
	tenant?: string;
}

export interface RoleAssignmentRequest extends PermitApiOptions {
	user: string;
	role: string;
	tenant: string;
}

// Centralized API client - single source of truth for all Permit.io API calls
export const usersApi = {
	list: async (options: ListUsersRequest) => {
		// Support both global and tenant-scoped user listing
		const endpoint = options.tenant
			? `tenants/${options.tenant}/users`
			: 'users';
		return permitApi<ListUsersResponse>(
			endpoint,
			options,
			MethodE.GET,
			undefined,
			{
				page: String(options.page || 1),
				per_page: String(options.perPage || 50),
				...(options.role && { role: options.role }),
			},
		);
	},

	// Role assignment endpoints follow RBAC best practices
	assign: async (options: RoleAssignmentRequest) => {
		return permitApi<RoleAssignmentResponse>(
			'role_assignments',
			options,
			MethodE.POST,
			{
				user: options.user,
				role: options.role,
				tenant: options.tenant,
			},
		);
	},

	unassign: async (options: RoleAssignmentRequest) => {
		return permitApi<void>('role_assignments', options, MethodE.DELETE, {
			user: options.user,
			role: options.role,
			tenant: options.tenant,
		});
	},
};

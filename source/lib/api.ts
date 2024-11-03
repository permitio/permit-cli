import { PERMIT_API_URL } from '../config.js';

type ApiResponse = {
	headers: Headers;
	response: any;
	status: number;
};

export const apiCall = async (
	endpoint: string,
	token: string,
	cookie?: string,
	method = 'GET',
	body?: string,
): Promise<ApiResponse> => {
	const options: RequestInit = {
		method,
		headers: {
			Accept: '*/*',
			Origin: 'https://app.permit.io',
			Authorization: `Bearer ${token}`,
			Cookie: cookie ?? '',
		},
	};

	if (body) {
		options.body = body;
	}

	const res = await fetch(`${PERMIT_API_URL}/${endpoint}`, options);

    if (!res.ok) {
	    const error = await res.json(); // Attempt to parse error response
	    throw new Error(`Error ${res.status}: ${error.detail || res.statusText}`);
  }
  
	const response = await res.json();

	return {
		headers: res.headers,
		response,
		status: res.status,
	};
};

// Fetch all resource instances for a project and environment
export const fetchResourceInstances = async (
	projId: string,
	envId: string,
	token: string,
	tenant?: string,
	resource?: string,
	search?: string[]
): Promise<ApiResponse> => {
	const searchParams = new URLSearchParams();
	if (tenant) searchParams.append("tenant", tenant);
	if (resource) searchParams.append("resource", resource);
	search?.forEach((s) => searchParams.append("search", s));

	const endpoint = `v2/facts/${projId}/${envId}/resource_instances?${searchParams.toString()}`;
	return await apiCall(endpoint, token);
};

// Fetch relationships for a given resource
export const fetchRelationships = async (
	projId: string,
	envId: string,
	resourceId: string,
	token: string,
	page: number = 1,
	per_page: number = 30
): Promise<ApiResponse> => {
	const endpoint = `v2/schema/${projId}/${envId}/resources/${resourceId}/relations?page=${page}&per_page=${per_page}`;
	return await apiCall(endpoint, token);
};

// Fetch role assignments for a project and environment
export const fetchRoleAssignments = async (
	projId: string,
	envId: string,
	token: string,
	user?: string[],
	role?: string[],
	tenant?: string[],
	resource?: string,
	resource_instance?: string
): Promise<ApiResponse> => {
	const searchParams = new URLSearchParams();
	user?.forEach((u) => searchParams.append("user", u));
	role?.forEach((r) => searchParams.append("role", r));
	tenant?.forEach((t) => searchParams.append("tenant", t));
	if (resource) searchParams.append("resource", resource);
	if (resource_instance) searchParams.append("resource_instance", resource_instance);

	const endpoint = `v2/facts/${projId}/${envId}/role_assignments?${searchParams.toString()}`;
	return await apiCall(endpoint, token);
};

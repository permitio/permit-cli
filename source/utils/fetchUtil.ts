export enum MethodE {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	PATCH = 'PATCH',
	DELETE = 'DELETE',
}

/**
 * Generic fetch wrapper with consistent error handling and type safety
 */
export interface FetchResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	status?: number;
}

/**
 * Determines if a method requires a body.
 */
const isBodyRequired = (method: MethodE): boolean => {
	return [MethodE.POST, MethodE.PATCH, MethodE.DELETE, MethodE.PUT].includes(
		method,
	);
};

/**
 * Centralized fetch utility - single point for HTTP request configuration
 */
export async function fetchUtil<T>(
	url: string,
	method: MethodE,
	apiKey?: string,
	headers?: Record<string, string>,
	body?: object,
): Promise<FetchResponse<T>> {
	// Consistent error handling across all API calls
	try {
		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
				...headers,
			},
			body: isBodyRequired(method) && body ? JSON.stringify(body) : undefined,
		});

		// Handle non-OK responses (e.g., 400, 404, 500)
		if (!response.ok) {
			const errorMessage = await response.text();
			return {
				success: false,
				error: errorMessage || `HTTP Error: ${response.status}`,
				status: response.status,
			};
		}

		// Try parsing JSON, handle errors if response isn't JSON
		try {
			const data: T = await response.json();
			return { success: true, data, status: response.status };
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (jsonError: any) {
			return {
				success: false,
				error: jsonError.message,
				status: response.status,
			};
		}
	} catch (error) {
		// Handle network errors and unexpected issues
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}

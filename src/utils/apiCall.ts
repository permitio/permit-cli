import { PERMIT_API_URL } from '../config/config.js';
import { APIError } from '../errors/errors.js';

export type ApiResponse = {
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
): Promise<ApiResponse | APIError> => {
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
		const cause = await res.json();
		return new APIError({
			message: `${res.status} ${res.statusText}`,
			status: res.status.toString(),
			statusCode: res.status,
			path: endpoint,
			cause: JSON.stringify(cause, null, 2),
		});
	}

	const response = await res.json();
	return {
		headers: res.headers,
		response,
		status: res.status,
	};
};

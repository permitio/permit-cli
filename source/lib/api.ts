import { PERMIT_API_URL } from '../config.js';

type ApiResponse<T> = {
	headers: Headers;
	response: T;
	status: number;
};

export const apiCall = async <T>(
	endpoint: string,
	token: string,
	cookie?: string,
	method = 'GET',
	body?: string,
): Promise<ApiResponse<T>> => {
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

	const response: T = await res.json();

	return {
		headers: res.headers,
		response,
		status: res.status,
	};
};

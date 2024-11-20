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

	const response = await res.json();

	return {
		headers: res.headers,
		response,
		status: res.status,
	};
};

import { PERMIT_API_URL } from '../config.js';

type ApiResponse = {
	headers: Headers;
	response: any;
	status: number;
	error: string | null
};

export const apiCall = async <T>(
	endpoint: string,
	token: string,
	cookie?: string | null | undefined,
	method = 'GET',
	body?: string,
): Promise<ApiResponse> => {

	let defaultResponse: ApiResponse = {
		headers: new Headers(),
		response: {},
		status: -1,
		error: null,
	};

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

	try {
		const res = await fetch(`${PERMIT_API_URL}/${endpoint}`, options);

		if (!res.ok) {
			const errorText = await res.text();
			defaultResponse.error = `Request failed with status ${res.status}: ${errorText}`;
			defaultResponse.status = res.status;
		} else {
			const response = await res.json();
			defaultResponse.headers = res.headers;
			defaultResponse.response = response as T;
			defaultResponse.status = res.status;
		}

	} catch (error: any) {
		defaultResponse.error = error instanceof Error ? error.message : 'Unknown fetch error occurred';
	}
	return defaultResponse;
};

import { PERMIT_API_URL } from '../config.js';

type ApiResponse<T> = {
	headers: Headers;
	response: T;
	status: number;
	error: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiCall = async <T = any>(
	endpoint: string,
	token: string,
	cookie?: string | null | undefined,
	method = 'GET',
	body?: string,
): Promise<ApiResponse<T>> => {
	let defaultResponse: ApiResponse<T> = {
		headers: new Headers(),
		response: {} as T,
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
			'Content-Type': 'application/json',
		},
	};

	if (body) {
		options.body = body;
	}

	try {
		const res = await fetch(`${PERMIT_API_URL}/${endpoint}`, options);

		if (!res.ok) {
			const errorText = await res.json();
			defaultResponse.error = `Request failed with status ${res.status}: ${errorText.message ?? errorText.detail}`;
			defaultResponse.status = res.status;
		} else {
			const response = await res.json();
			defaultResponse.headers = res.headers;
			defaultResponse.response = response as T;
			defaultResponse.status = res.status;
		}
	} catch (error: unknown) {
		defaultResponse.error =
			error instanceof Error ? error.message : 'Unknown fetch error occurred';
	}
	return defaultResponse;
};

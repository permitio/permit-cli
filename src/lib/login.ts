import { APIError } from '../errors/errors.js';
import { apiCall } from '../utils/apiCall.js';
import http from 'http';
import { randomBytes, createHash } from 'crypto';
import open from 'open';

type LoginResponse = {
	accessToken: string;
	cookie: string;
};

export const logIn = async (): Promise<APIError | LoginResponse> => {
	await browserAuth();
	const token = await authCallbackServer();
	const res = await apiCall('v2/auth/login', token ?? '', '', 'POST');
	if (res instanceof APIError) {
		return res;
	}

	return {
		accessToken: token ?? '',
		cookie: res.headers.getSetCookie()[0] ?? '',
	};
};



 const authCallbackServer = async (): Promise<string> => {
	return new Promise<string>(resolve => {
		const server = http.createServer(async (request, res) => {
			const url = new URL(request.url!, `http://${request.headers.host}`);
			const code = url.searchParams.get('code');
			const verifier = url.searchParams.get('verifier');
			if (!code) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/plain');
				res.end('Authorization code not found in query string\n');
				return;
			}
			const data = await fetch('https://auth.permit.io/oauth/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					grant_type: 'authorization_code',
					client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
					code_verifier: verifier,
					code,
					redirect_uri: 'http://localhost:62419',
				}),
			}).then(async response => response.json());
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('You can close this page now\n');
			server.close();
			resolve(data.access_token as string);
		});

		server.listen(62_419, 'localhost');

		setTimeout(() => {
			server.close();
			resolve('');
		}, 600_000);
	});
};

 const browserAuth = async (): Promise<void> => {
	function base64UrlEncode(string_: string | Buffer) {
		return string_
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	const verifier = base64UrlEncode(randomBytes(32));
	function sha256(buffer: string | Buffer) {
		return createHash('sha256').update(buffer).digest();
	}

	const challenge = base64UrlEncode(sha256(verifier));
	const parameters = new URLSearchParams({
		audience: 'https://api.permit.io/v1/',
		screen_hint: 'app.permit.io',
		domain: 'app.permit.io',
		auth0Client: 'eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xMC4yIn0=',
		isEAP: 'false',
		response_type: 'code',
		fragment: 'domain=app.permit.io',
		code_challenge: challenge,
		code_challenge_method: 'S256',
		client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
		redirect_uri: `http://localhost:62419?verifier=${verifier}`,
		scope: 'openid profile email',
		state: 'bFR2dn5idUhBVDNZYlhlSEFHZnJaSjRFdUhuczdaSlhCSHFDSGtlYXpqbQ==',
	});
	await open(`https://auth.permit.io/authorize?${parameters.toString()}`);
};

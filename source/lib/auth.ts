import { createHash, randomBytes } from 'node:crypto';
import { IncomingMessage, ServerResponse, createServer } from 'node:http';
import open from 'open';
import * as pkg from 'keytar';
import {
	AUTH_API_URL,
	AUTH_PERMIT_DOMAIN,
	AUTH_REDIRECT_HOST,
	AUTH_REDIRECT_PORT,
	AUTH_REDIRECT_URI,
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	KEYSTORE_PERMIT_SERVICE_NAME,
	AUTH_PERMIT_URL,
} from '../config.js';
import { URL, URLSearchParams } from 'url';
import { setTimeout } from 'timers';
import { Buffer } from 'buffer';

const { setPassword, getPassword, deletePassword } = pkg.default;

// Runtime detection
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Import appropriate modules based on runtime
let crypto: any;
let http: any;

if (isNode) {
	crypto = await import('node:crypto');
	http = await import('node:http');
} else {
	// Browser environment
	crypto = {
		createHash: (algorithm: string) => ({
			update: (data: string | Uint8Array) => ({
				digest: () => {
					const encoder = new TextEncoder();
					const dataArray = typeof data === 'string' ? encoder.encode(data) : data;
					return crypto.subtle.digest(algorithm, dataArray);
				}
			})
		})
	};
	http = {
		createServer: (handler: any) => ({
			listen: (port: number, host: string) => {
				// Browser doesn't support server creation
				throw new Error('Server creation not supported in browser environment');
			}
		})
	};
}

export enum TokenType {
	APIToken = 'APIToken',
	AccessToken = 'AccessToken',
	Invalid = 'Invalid',
}

export const tokenType = (token: string): TokenType => {
	if (token.length >= 97 && token.startsWith('permit_key_')) {
		return TokenType.APIToken;
	}

	// TBD add a better JWT validation/verification
	if (token.split('.').length === 3) {
		return TokenType.AccessToken;
	}

	return TokenType.Invalid;
};

export const saveAuthToken = async (token: string): Promise<string> => {
	try {
		const t: TokenType = tokenType(token);
		if (t === TokenType.Invalid) {
			return 'Invalid auth token';
		}

		await setPassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
			token,
		);
		return '';
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
};

export const loadAuthToken = async (): Promise<string> => {
	const token = await getPassword(
		KEYSTORE_PERMIT_SERVICE_NAME,
		DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	);
	if (!token) {
		throw new Error(
			'No token found, use `permit login` command to get an auth token',
		);
	}

	return token;
};

export const cleanAuthToken = async () => {
	await deletePassword(
		KEYSTORE_PERMIT_SERVICE_NAME,
		DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	);
};

export const authCallbackServer = async (verifier: string): Promise<string> => {
	return new Promise<string>(resolve => {
		// Define the server logic
		const server = createServer(async (request: IncomingMessage, res: ServerResponse) => {
			// Get the authorization code from the query string
			const url = new URL(request.url!, `http://${request.headers.host}`);
			if (!url.searchParams.has('code')) {
				// TBD add better error handling for error callbacks
				res.statusCode = 200; // Set the response status code
				res.setHeader('Content-Type', 'text/plain'); // Set the content type
				res.end('Authorization code not found in query string\n'); // Send the response
				return;
			}

			const code = url.searchParams.get('code');
			// Send the response
			const data = await fetch(`${AUTH_PERMIT_URL}/oauth/token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					grant_type: 'authorization_code',
					client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
					code_verifier: verifier,
					code,
					redirect_uri: AUTH_REDIRECT_URI,
				}),
			}).then(async response => response.json());
			res.statusCode = 200; // Set the response status code
			res.setHeader('Content-Type', 'text/plain'); // Set the content type
			res.end('You can close this page now\n'); // Send the response
			server.close(); // Close the server
			resolve(data.access_token as string); // Resolve the promise
		});

		// Specify the port and host
		// Start the server and listen on the specified port
		server.listen(AUTH_REDIRECT_PORT, AUTH_REDIRECT_HOST);

		setTimeout(() => {
			server.close();
			resolve('');
		}, 600_000);
	});
};

export const browserAuth = async (): Promise<string> => {
	// Open the authentication URL in the default browser
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
		audience: AUTH_API_URL,
		screen_hint: AUTH_PERMIT_DOMAIN,
		domain: AUTH_PERMIT_DOMAIN,
		auth0Client: 'eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xMC4yIn0=',
		isEAP: 'false',
		response_type: 'code',
		fragment: `domain=${AUTH_PERMIT_DOMAIN}`,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
		redirect_uri: AUTH_REDIRECT_URI,
		scope: 'openid profile email',
		state: 'bFR2dn5idUhBVDNZYlhlSEFHZnJaSjRFdUhuczdaSlhCSHFDSGtlYXpqbQ==',
	});
	await open(`${AUTH_PERMIT_URL}/authorize?${parameters.toString()}`);
	return verifier;
};

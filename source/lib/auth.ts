import { createHash, randomBytes } from 'node:crypto';
import { IncomingMessage, ServerResponse, createServer } from 'node:http';
import open from 'open';
import { join } from 'node:path';
import { homedir } from 'node:os';
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
import { URL, URLSearchParams } from 'node:url';
import { setTimeout } from 'node:timers';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TOKEN_FILE = join(homedir(), '.permit', 'token');
const KEY_FILE = join(homedir(), '.permit', 'key');

// Ensure .permit directory exists
if (!existsSync(join(homedir(), '.permit'))) {
	mkdirSync(join(homedir(), '.permit'), { recursive: true });
}

// Generate or load encryption key
const encryptionKey: Uint8Array = existsSync(KEY_FILE) 
	? new Uint8Array(readFileSync(KEY_FILE))
	: (() => {
		const key = new Uint8Array(randomBytes(32));
		writeFileSync(KEY_FILE, key);
		return key;
	})();

// Simple XOR encryption (for demonstration, in production use proper encryption)
function encrypt(text: string): string {
	const textBytes = new TextEncoder().encode(text);
	const encrypted = new Uint8Array(textBytes.length);
	for (let i = 0; i < textBytes.length; i++) {
		encrypted[i] = textBytes[i]! ^ encryptionKey[i % encryptionKey.length]!;
	}
	return Buffer.from(encrypted).toString('base64');
}

function decrypt(encrypted: string): string {
	const encryptedBytes = new Uint8Array(Buffer.from(encrypted, 'base64'));
	const decrypted = new Uint8Array(encryptedBytes.length);
	for (let i = 0; i < encryptedBytes.length; i++) {
		decrypted[i] = encryptedBytes[i]! ^ encryptionKey[i % encryptionKey.length]!;
	}
	return new TextDecoder().decode(decrypted);
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

		writeFileSync(TOKEN_FILE, encrypt(token));
		return '';
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
};

export const loadAuthToken = async (): Promise<string> => {
	if (!existsSync(TOKEN_FILE)) {
		throw new Error(
			'No token found, use `permit login` command to get an auth token',
		);
	}

	const encrypted = readFileSync(TOKEN_FILE, 'utf8');
	return decrypt(encrypted);
};

export const cleanAuthToken = async () => {
	if (existsSync(TOKEN_FILE)) {
		writeFileSync(TOKEN_FILE, '');
	}
};

export const authCallbackServer = async (verifier: string): Promise<string> => {
	return new Promise<string>(resolve => {
		// Define the server logic
		const server = createServer(
			async (request: IncomingMessage, res: ServerResponse) => {
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
			},
		);

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

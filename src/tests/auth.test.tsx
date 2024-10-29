import { describe, it, expect, vi } from 'vitest';
import {
	tokenType,
	saveAuthToken,
	loadAuthToken,
	cleanAuthToken,
	authCallbackServer,
	browserAuth,
} from '../lib/auth.js';
import * as keytar from 'keytar';
import * as http from 'node:http';
import open from 'open';
import { IncomingMessage, ServerResponse } from 'http';
import {
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
	KEYSTORE_PERMIT_SERVICE_NAME,
} from '../config.js';

vi.mock('keytar', () => ({
	setPassword: vi.fn(),
	getPassword: vi.fn(),
	deletePassword: vi.fn(),
}));

vi.mock('node:http', () => ({
	createServer: vi.fn(),
}));

// Mock the global fetch function
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

vi.mock('open', () => ({
	default: vi.fn(),
}));

describe('auth.ts', () => {
	describe('tokenType', () => {
		it('should return APIToken for valid API token', () => {
			const token = 'permit_key_' + 'a'.repeat(90);
			expect(tokenType(token)).toBe('APIToken');
		});

		it('should return AccessToken for valid JWT token', () => {
			const token = 'header.payload.signature';
			expect(tokenType(token)).toBe('AccessToken');
		});

		it('should return Invalid for invalid token', () => {
			const token = 'invalid_token';
			expect(tokenType(token)).toBe('Invalid');
		});
	});

	describe('saveAuthToken', () => {
		it('should save a valid token to keytar', async () => {
			vi.mocked(keytar.setPassword).mockResolvedValueOnce(undefined);

			const token = 'permit_key_' + 'a'.repeat(90);

			await saveAuthToken(token);

			expect(keytar.setPassword).toHaveBeenCalledWith(
				KEYSTORE_PERMIT_SERVICE_NAME,
				DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
				token,
			);
		});

		it('should return an error for invalid token', async () => {
			const result = await saveAuthToken('invalid_token');
			expect(result).toBe('Invalid auth token');
		});

		it('should return error message when setPassword throws an error', async () => {
			// Mock setPassword to throw an error
			const errorMessage = 'Failed to save token';
			vi.mocked(keytar.setPassword).mockRejectedValueOnce(
				new Error(errorMessage),
			);

			const token = 'permit_key_' + 'a'.repeat(90);

			const result = await saveAuthToken(token);
			expect(result).toBeInstanceOf(Error);
		});
	});

	describe('loadAuthToken', () => {
		it('should load the saved token', async () => {
			vi.mocked(keytar.getPassword).mockResolvedValueOnce('saved_token');
			const token = await loadAuthToken();
			expect(token).toBe('saved_token');
		});

		it('should throw an error if no token is found', async () => {
			vi.mocked(keytar.getPassword).mockResolvedValueOnce(null);
			await expect(loadAuthToken()).rejects.toThrow(
				'No token found, use `permit login` command to get an auth token',
			);
		});
	});

	describe('cleanAuthToken', () => {
		it('should delete the saved token', async () => {
			await cleanAuthToken();
			expect(keytar.deletePassword).toHaveBeenCalled();
		});
	});

	describe('authCallbackServer', () => {
		it('should handle OAuth callback and resolve the token', async () => {
			const request = {
				url: '/?code=auth_code',
				headers: { host: 'localhost:62419' },
			};
			const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };

			// Mock the server methods
			const mockServer = {
				listen: vi.fn(),
				close: vi.fn(),
			};

			// Mock http.createServer to return a mocked server
			vi.spyOn(http, 'createServer').mockImplementation((handler: any) => {
				// Simulate the request handling
				handler(request as IncomingMessage, res as unknown as ServerResponse);
				return mockServer as any;
			});

			// Mock fetch to return a successful response
			mockFetch.mockResolvedValue({
				json: vi
					.fn()
					.mockResolvedValue({ access_token: 'mocked_access_token' }),
			});

			const token = await authCallbackServer('verifier');

			// Assert that the token is correctly retrieved
			expect(token).toBe('mocked_access_token');
			expect(mockServer.listen).toHaveBeenCalled();
			expect(mockServer.close).toHaveBeenCalled();
		});
	});

	describe('browserAuth', () => {
		it('should open the browser with the correct URL', async () => {
			const verifier = await browserAuth();
			expect(open).toHaveBeenCalledWith(
				expect.stringContaining('https://auth.permit.io/authorize'),
			);
			expect(verifier).toBeTruthy();
		});
	});
});

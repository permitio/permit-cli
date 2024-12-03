import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginFlow from '../source/components/LoginFlow.js';
import {
	browserAuth,
	authCallbackServer,
	tokenType,
	TokenType,
} from '../source/lib/auth.js';
import { useAuthApi } from '../source/hooks/useAuthApi.js';
import delay from 'delay';

vi.mock('../source/lib/auth.js', () => ({
	browserAuth: vi.fn(),
	authCallbackServer: vi.fn(),
	tokenType: vi.fn(),
	TokenType: {
		APIToken: 'APIToken',
	},
}));

vi.mock('../source/hooks/useAuthApi.js', () => ({
	useAuthApi: vi.fn(() => ({
		getLogin: vi.fn(),
	})),
}));

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('LoginFlow Component', () => {
	it('should handle valid API key and call onSuccess', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		const onSuccess = vi.fn();
		const onError = vi.fn();

		const { lastFrame } = render(
			<LoginFlow apiKey="valid_api_key" onSuccess={onSuccess} onError={onError} />
		);

		await delay(50); // Allow async operations to complete

		expect(onSuccess).toHaveBeenCalledWith('valid_api_key', '');
		expect(onError).not.toHaveBeenCalled();
		expect(lastFrame()).not.toMatch(/Logging in.../);
		expect(lastFrame()).toMatch(/Login to Permit/);
	});

	it('should handle invalid API key and call onError', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);
		const onSuccess = vi.fn();
		const onError = vi.fn();

		const { lastFrame } = render(
			<LoginFlow apiKey="invalid_api_key" onSuccess={onSuccess} onError={onError} />
		);

		await delay(50); // Allow async operations to complete

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(
			'Invalid API Key. Please provide a valid API Key or leave it blank to use browser authentication.'
		);
		expect(lastFrame()).not.toMatch(/Logging in.../);
	});

	it('should handle successful browser authentication and call onSuccess', async () => {
		vi.mocked(browserAuth).mockResolvedValue('verifier');
		vi.mocked(authCallbackServer).mockResolvedValue('browser_token');
		vi.mocked(useAuthApi).mockReturnValue({
			// @ts-ignore
			getLogin: vi.fn(() =>
				Promise.resolve({
					headers: {
						getSetCookie: () => ['cookie_value'],
					},
					error: null,
				})
			),
		});

		const onSuccess = vi.fn();
		const onError = vi.fn();

		const { lastFrame } = render(<LoginFlow onSuccess={onSuccess} onError={onError} />);

		await delay(50); // Allow async operations to complete

		expect(onSuccess).toHaveBeenCalledWith('browser_token', 'cookie_value');
		expect(onError).not.toHaveBeenCalled();
		expect(lastFrame()).not.toMatch(/Logging in.../);
		expect(lastFrame()).toMatch(/Login to Permit/);
	});

	it('should handle browser authentication error and call onError', async () => {
		vi.mocked(browserAuth).mockResolvedValue('verifier');
		vi.mocked(authCallbackServer).mockRejectedValue(new Error('Callback failed'));

		const onSuccess = vi.fn();
		const onError = vi.fn();

		const { lastFrame } = render(<LoginFlow onSuccess={onSuccess} onError={onError} />);

		await delay(50); // Allow async operations to complete

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith('Unexpected error during authentication. Error: Callback failed');
		expect(lastFrame()).not.toMatch(/Logging in.../);
	});

	it('should handle login API error and call onError', async () => {
		vi.mocked(browserAuth).mockResolvedValue('verifier');
		vi.mocked(authCallbackServer).mockResolvedValue('browser_token');
		vi.mocked(useAuthApi).mockReturnValue({
			// @ts-ignore
			getLogin: vi.fn(() =>
				Promise.resolve({
					headers: null,
					error: 'Network error',
				})
			),
		});

		const onSuccess = vi.fn();
		const onError = vi.fn();

		const { lastFrame } = render(<LoginFlow onSuccess={onSuccess} onError={onError} />);

		await delay(50); // Allow async operations to complete

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(
			'Login failed. Reason: Network error. Please check your network connection and try again.'
		);
		expect(lastFrame()).not.toMatch(/Logging in.../);
	});
});

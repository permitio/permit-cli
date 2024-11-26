import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Copy from '../source/commands/env/copy.js';
import { TokenType, tokenType } from '../source/lib/auth.js';
import { useEnvironmentApi } from '../source/hooks/useEnvironmentApi.js';
import delay from 'delay';

vi.mock('../source/lib/auth.js', () => ({
	loadAuthToken: vi.fn(),
	TokenType: {
		APIToken: 'APIToken',
	},
	tokenType: vi.fn(),
}));

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		getApiKeyScope: vi
			.fn()
			.mockImplementationOnce(() =>
				Promise.resolve({
					response: { organisation_id: 'org-1', project_id: 'project1', environment_id: null },
					error: null,
				}),
			)
			.mockImplementationOnce(() =>
				Promise.resolve({
					response: { organisation_id: 'org-1', project_id: 'project1', environment_id: 'env1' },
					error: null,
				}),
			)
			.mockImplementation(() => {
				console.log('getApiKeyScope fallback called');
				return Promise.resolve({
					response: {},
					error: null,
				});
			}),
	})),
}));

vi.mock('../source/hooks/useEnvironmentApi.js', () => ({
	useEnvironmentApi: vi.fn(() => ({
		copyEnvironment: vi.fn(() =>
			Promise.resolve({
				error: null,
			}),
		),
	})),
}));

vi.mock('ink-form', () => ({
	Form: vi.fn(),
}));

beforeEach(() => {
	// @ts-ignore
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Copy Component', () => {
	it('should display loading state initially', () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		const { lastFrame } = render(
			<Copy options={{ key: 'valid_api_key' }} />,
		);

		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should handle invalid API key', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		const { lastFrame } = render(
			<Copy options={{ key: 'invalid_api_key' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Invalid API Key. Please provide a valid API Key./);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should display error if environment copying fails', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		vi.mocked(useEnvironmentApi).mockReturnValue({
			// @ts-ignore
			copyEnvironment: vi.fn(() =>
				Promise.resolve({
					error: 'Error copying environment',
				}),
			),
		});

		const { lastFrame } = render(
			<Copy options={{ key: 'valid_api_key', envId: 'env2' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Error while copying Environment: Error copying environment/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should display success message on environment copying', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		const { lastFrame } = render(
			<Copy options={{ key: 'valid_api_key', envId: 'env2' }} />,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Environment copied successfully/);
	});
});

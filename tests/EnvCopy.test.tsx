import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Copy from '../source/commands/env/copy.js';
import { TokenType, tokenType } from '../source/lib/auth.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../source/hooks/useEnvironmentApi.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import delay from 'delay';

vi.mock('../source/lib/auth.js', () => ({
	TokenType: {
		APIToken: 'APIToken',
	},
	tokenType: vi.fn(),
}));

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		getApiKeyScope: vi.fn(),
	})),
}));

vi.mock('../source/hooks/useEnvironmentApi.js', () => ({
	useEnvironmentApi: vi.fn(() => ({
		copyEnvironment: vi.fn(),
	})),
}));

vi.mock('../source/components/EnvironmentSelection.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('@inkjs/ui', () => ({
	TextInput: vi.fn(),
}));

beforeEach(() => {
	vi.restoreAllMocks();
	// @ts-ignore
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Copy Component', () => {
	it('should display loading state initially', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		vi.mocked(useApiKeyApi).mockReturnValue({
			// @ts-ignore
			getApiKeyScope: vi.fn(() =>
				Promise.resolve({
					response: { project_id: 'project1', environment_id: null },
					error: null,
				})
			),
		});

		const { lastFrame } = render(<Copy options={{ key: 'valid_api_key' }} />);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Select an existing Environment to copy from/);
	});

	it('should handle invalid API key and display error', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		const { lastFrame } = render(<Copy options={{ key: 'invalid_api_key' }} />);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Invalid API Key. Please provide a valid API Key./);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should handle environment selection and transition to input for existing environment ID', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		vi.mocked(useApiKeyApi).mockReturnValue({
			// @ts-ignore
			getApiKeyScope: vi.fn(() =>
				Promise.resolve({
					response: { project_id: 'project1', environment_id: null },
					error: null,
				})
			),
		});

		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Project1', value: 'project1' },
				{ label: 'Environment1', value: 'env1' },
				'secret_token'
			);
			return null;
		});

		const { lastFrame } = render(<Copy options={{ key: 'valid_api_key', existing: true }} />);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Input the existing EnvironmentId to copy to/);
	});

	it('should handle successful environment copy and display success message', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		// Mock API key scope response
		vi.mocked(useApiKeyApi).mockReturnValue({
			// @ts-ignore
			getApiKeyScope: vi.fn(() =>
				Promise.resolve({
					response: { project_id: 'project1', environment_id: null },
					error: null,
				})
			),
		});

		// Mock environment copy API call
		vi.mocked(useEnvironmentApi).mockReturnValue({
			// @ts-ignore
			copyEnvironment: vi.fn(() =>
				Promise.resolve({
					error: null,
				})
			),
		});

		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' }, // Organisation
				{ label: 'Project1', value: 'proj1' }, // Project
				{ label: 'Environment1', value: 'env1' }, // Environment
				'secret_token' // Secret
			);
			return null;
		});

		// Render the component
		const { lastFrame } = render(
			<Copy options={{ key: 'valid_api_key', envName: 'qwerty' }} />
		);

		// Wait for state transitions
		await delay(100); // Increase delay to ensure async operations complete

		// Verify the success message
		expect(lastFrame()).toMatch(/Environment copied successfully/);
	});
});

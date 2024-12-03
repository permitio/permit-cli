import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Select from '../source/commands/env/select.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import { saveAuthToken, TokenType, tokenType } from '../source/lib/auth.js';
import delay from 'delay';

vi.mock('../source/components/EnvironmentSelection.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('../source/lib/auth.js', () => ({
	saveAuthToken: vi.fn(),
	TokenType: {
		APIToken: 'APIToken',
	},
	tokenType: vi.fn(),
}));

beforeEach(() => {
	// @ts-ignore
	vi.spyOn(process, 'exit').mockImplementation((code) => {
		console.log(`Mocked process.exit(${code}) called`);
		return null
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Select Component', () => {
	it('should display loading state initially', () => {
		const { lastFrame } = render(
			<Select options={{ key: 'valid_api_key' }} />
		);

		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should transition to selecting state with a valid API key', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);

		const { lastFrame } = render(
			<Select options={{ key: 'valid_api_key' }} />
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).not.toMatch(/Loading your environment/);
		expect(EnvironmentSelection).toHaveBeenCalledWith(
			expect.objectContaining({
				accessToken: 'valid_api_key',
				onComplete: expect.any(Function),
				onError: expect.any(Function),
			}),
			{}
		);
	});

	it('should display error for an invalid API key', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.Invalid);

		const { lastFrame } = render(
			<Select options={{ key: 'invalid_api_key' }} />
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Invalid API Key. Please provide a valid API Key./);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should display success message on environment selection', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		// @ts-ignore
		vi.mocked(saveAuthToken).mockResolvedValue(undefined);
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

		const { lastFrame } = render(
			<Select options={{ key: 'valid_api_key' }} />
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Environment: Environment1 selected successfully/);
		expect(saveAuthToken).toHaveBeenCalledWith('secret_token');
	});

	it('should display error if saving auth token fails', async () => {
		vi.mocked(tokenType).mockReturnValue(TokenType.APIToken);
		vi.mocked(saveAuthToken).mockRejectedValue('Failed to save token');
		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Project1', value: 'proj1' },
				{ label: 'Environment1', value: 'env1' },
				'secret_token'
			);
			return null;
		});

		const { lastFrame } = render(
			<Select options={{ key: 'valid_api_key' }} />
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Failed to save token/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Select from '../source/commands/env/select.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import Login from '../source/commands/login.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import { saveAuthToken } from '../source/lib/auth.js';
import delay from 'delay';

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		validateApiKey: vi.fn(),
	})),
}));

vi.mock('../source/commands/login.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('../source/components/EnvironmentSelection.js', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('../source/lib/auth.js', () => ({
	saveAuthToken: vi.fn(),
}));

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(process, 'exit').mockImplementation(code => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Select Component', () => {
	it('should display loading state initially', async () => {
		const { lastFrame } = render(<Select options={{}} />);

		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should redirect to login when no API key is provided', async () => {
		// Mock the Login component
		vi.mocked(Login).mockImplementation(() => (
			<Text>Mocked Login Component</Text>
		));

		const { lastFrame } = render(<Select options={{}} />);

		await delay(50); // Allow state transitions to occur

		expect(lastFrame()).toMatch(/No Key provided, Redirecting to Login/);
		expect(lastFrame()).toMatch(/Mocked Login Component/);
	});

	it('should display error for invalid API key', async () => {
		// Mock validateApiKey to return false
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKey: vi.fn(() => false),
		});

		const { lastFrame } = render(
			<Select options={{ key: 'invalid_api_key' }} />,
		);

		await delay(50); // Allow state transitions to occur

		expect(lastFrame()).toMatch(
			/Invalid API Key. Please provide a valid API Key./,
		);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should handle environment selection successfully', async () => {
		// Mock validateApiKey to return true
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKey: vi.fn(() => true),
		});

		// Mock saveAuthToken
		vi.mocked(saveAuthToken).mockResolvedValueOnce();

		// Mock EnvironmentSelection component
		vi.mocked(EnvironmentSelection).mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Proj1', value: 'proj1' },
				{ label: 'Env1', value: 'env1' },
				'secret_token',
			);
			return null;
		});

		const { lastFrame } = render(<Select options={{ key: 'valid_api_key' }} />);

		await delay(100); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Environment: Env1 selected successfully/);
	});
});

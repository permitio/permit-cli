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
import SelectComponent from '../source/components/env/SelectComponent';
import { useUnauthenticatedApi } from '../source/hooks/useUnauthenticatedApi';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

// vi.mock('../source/hooks/useApiKeyApi.js', () => ({
// 	useApiKeyApi: vi.fn(() => ({
// 		validateApiKey: vi.fn(),
// 		validateApiKeyScope: vi.fn(),
// 	})),
// }));

vi.mock('../source/components/AuthProvider.tsx', async () => {
	const original = await vi.importActual(
		'../source/components/AuthProvider.tsx',
	);
	return {
		...original,
		useAuth: () => ({
			authToken: demoPermitKey,
		}),
	};
});


vi.mock('../source/hooks/useUnauthenticatedApi', async() => {
	const original = await vi.importActual('../source/hooks/useUnauthenticatedApi');

	return {
		...original,
		useUnauthenticatedApi: () => ({
			getApiKeyScope: vi.fn().mockResolvedValue({
				response: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
				status: 200,
			}),
			getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
				response: { secret: 'test-secret' },
				error: null,
			}),
			validateApiKeyScope: vi.fn().mockResolvedValue({
				valid: true,
				scope: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
			}),
		}),
	};
});

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
		const { lastFrame } = render(<SelectComponent key={demoPermitKey} />);
		expect(lastFrame()).toMatch(/Loading your environment/);
	});

	it('should handle environment selection successfully', async () => {
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
	it('should handle environment selection failure', async () => {
		// Mock saveAuthToken
		vi.mocked(saveAuthToken).mockRejectedValueOnce('Failed to save token');

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

		const { lastFrame } = render(<SelectComponent key={demoPermitKey} />);

		await delay(100); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Failed to save token/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('handle complete enviroment selection process', async () => {
		vi.mocked(saveAuthToken).mockResolvedValueOnce();
		vi.mocked(EnvironmentSelection).mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Proj1', value: 'proj1' },
				{ label: 'Env1', value: 'env1' },
				'secret_token',
			);
			return null;
		});
		const { lastFrame } = render(<SelectComponent key={demoPermitKey} />);
		await delay(100); // Allow async operations to complete
		expect(lastFrame()).toMatch(/Environment: Env1 selected successfully/);
	});
});

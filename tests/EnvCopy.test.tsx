import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Copy from '../source/commands/env/copy.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../source/hooks/useEnvironmentApi.js';
import EnvironmentSelection from '../source/components/EnvironmentSelection.js';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		validateApiKeyScope: vi.fn(),
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

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(process, 'exit').mockImplementation(code => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});


vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
	const keytar = {
		setPassword: vi.fn().mockResolvedValue(demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),

	};
	return { ...keytar, default: keytar };
});


afterEach(() => {
	vi.restoreAllMocks();
});

describe('Copy Component', () => {
	it('should handle successful environment copy flow using arguments', async () => {
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		vi.mocked(useEnvironmentApi).mockReturnValue({
			copyEnvironment: vi.fn(() =>
				Promise.resolve({
					error: null,
				}),
			),
		});

		// @ts-ignore
		EnvironmentSelection.mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' }, // Organisation
				{ label: 'Project1', value: 'proj1' }, // Project
				{ label: 'Environment1', value: 'env1' }, // Environment
			);
			return null;
		});

		const { lastFrame } = render(
			<Copy
				options={{
					key: 'valid_api_key',
					name: 'NewEnvName',
					description: 'New Env Desc',
					conflictStrategy: 'fail',
				}}
			/>,
		);

		await delay(100); // Allow name input
		expect(lastFrame()).toMatch(/Environment copied successfully/);
	});

	it('should handle invalid API key gracefully', async () => {
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: false,
					error: 'Invalid API Key',
				}),
			),
		});

		const { lastFrame } = render(<Copy options={{ key: 'invalid_api_key' }} />);

		await delay(50); // Allow async operations to complete

		expect(lastFrame()).toMatch(/Invalid API Key/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});

	it('should handle successful environment copy flow using the wizard', async () => {
		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		vi.mocked(useEnvironmentApi).mockReturnValue({
			copyEnvironment: vi.fn(() =>
				Promise.resolve({
					error: null,
				}),
			),
		});

		vi.mocked(EnvironmentSelection).mockImplementation(({ onComplete }) => {
			onComplete(
				{ label: 'Org1', value: 'org1' },
				{ label: 'Proj1', value: 'proj1' },
				{ label: 'Env1', value: 'env1' },
				'secret',
			);
			return null;
		});

		const { lastFrame, stdin } = render(
			<Copy options={{ key: 'valid_api_key', conflictStrategy: 'fail' }} />,
		);

		await delay(50); // Allow environment selection

		stdin.write('NewEnvName\n'); // Enter new environment name
		await delay(50); // Allow name input
		stdin.write('\r');
		await delay(50);
		stdin.write('NewEnvDescription\n'); // Enter new environment description
		await delay(50); // Allow description input
		stdin.write('\r');
		await delay(50); // Allow name input

		expect(lastFrame()).toMatch(/Environment copied successfully/);
	});
});

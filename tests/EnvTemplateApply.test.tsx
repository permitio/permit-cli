import React from 'react';
import { render } from 'ink-testing-library';
import Apply from '../source/commands/env/template/apply';
import { vi, describe, it, expect } from 'vitest';
import { loadAuthToken } from '../source/lib/auth.js';
import { useEnvironmentApi } from '../source/hooks/useEnvironmentApi.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import delay from 'delay';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
	const keytar = {
		setPassword: vi.fn().mockResolvedValue(demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});

vi.mock('../source/hooks/useEnvironmentApi.js', () => ({
	useEnvironmentApi: vi.fn(),
}));
vi.mock('../source/hooks/useApiKeyApi', async () => {
	const original = await vi.importActual('../source/hooks/useApiKeyApi');
	return {
		...original,
		useApiKeyApi: () => ({
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

describe('Apply Command', () => {
	it('Should display the values', async () => {
		const { stdout, stdin } = render(
			<Apply options={{ key: demoPermitKey }}></Apply>,
		);
		await delay(1000);
		console.log(stdout.lastFrame());
		expect(stdout.lastFrame()).contains('❯ fga-tradeoffs\n');
		expect(stdout.lastFrame()).contains('mesa-verde-banking-demo');
	});
});

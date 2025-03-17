import React from 'react';
import { render } from 'ink-testing-library';
import Apply from '../source/commands/env/template/apply.js';
import { vi, describe, it, expect } from 'vitest';
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


vi.mock('../source/hooks/useUnauthenticatedApi', async () => {
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

describe('Apply Command', () => {
	it('Should display the values', async () => {
		const { lastFrame } = render(
			<Apply options={{ apiKey: demoPermitKey }}></Apply>,
		);
		await delay(100);
		expect(lastFrame()).toContain('fga-tradeoffs');
		expect(lastFrame()).toContain('mesa-verde-banking-demo');
	});
});

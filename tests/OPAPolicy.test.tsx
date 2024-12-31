import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import Policy from '../source/commands/opa/policy';
import delay from 'delay';
import * as keytar from "keytar"
global.fetch = vi.fn();
const enter = '\r';
vi.mock("keytar",()=>({
	getPassword: vi.fn(),
	setPassword: vi.fn(),
	deletePassword:vi.fn()
}))
const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});
vi.mock('../source/hooks/useApiKeyApi', async() => {
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
				error: null
			})
		}),
	}
});


describe('OPA Policy Command', () => {
	it('should render the policy command', async () => {
		const options = {
			serverUrl: 'http://localhost:8181',
			keyAccount: 'testAccount',
			apiKey: 'permit_key_'.concat('a'.repeat(97)),
		};
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				result: [
					{ id: 'policy1', name: 'policyName1' },
					{ id: 'policy2', name: 'policyName2' },
				],
			}),
			status: 200,
		});
		const { stdin, lastFrame } = render(<Policy options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()?.toString()).toMatch(
			'Listing Policies on Opa Server=http://localhost:8181',
		);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch('Showing 2 of 2 policies:');
		expect(lastFrame()?.toString()).toMatch('policy1');
		expect(lastFrame()?.toString()).toMatch('policy2');
		stdin.write(enter);
	});
	it('should render the policy command with error', async () => {
		const options = {
			serverUrl: 'http://localhost:8181',
			keyAccount: 'testAccount',
		};
		(fetch as any).mockRejectedValueOnce(new Error('Error'));
		const { lastFrame } = render(<Policy options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()?.toString()).toMatch(
			'Listing Policies on Opa Server=http://localhost:8181',
		);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Request failed:/);
	});
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import Policy from '../source/commands/opa/policy';
import delay from 'delay';
import * as keytar from 'keytar';
global.fetch = vi.fn();
const enter = '\r';
vi.mock('keytar', () => ({
	getPassword: vi.fn(),
	setPassword: vi.fn(),
	deletePassword: vi.fn(),
}));

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
		expect(lastFrame()?.toString()).toMatch(
			'Listing Policies on Opa Server=http://localhost:8181',
		);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Request failed:/);
	});
});

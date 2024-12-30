import React from 'react';
import { render } from 'ink-testing-library';
import ApiKey from '../source/commands/apiKey';
import { vi, describe, it, expect } from 'vitest';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar', () => ({
	setPassword: vi.fn(),
	getPassword: vi.fn(),
	deletePassword: vi.fn(),
}));

describe('ApiKey', () => {
	it('Should save the key', () => {
		const permitKey = 'permit_key_'.concat('a'.repeat(97));
		const { lastFrame } = render(
			<ApiKey args={['save', permitKey]} options={{ keyAccount: 'test' }} />,
		);
		expect(lastFrame()).toMatch(/Key saved to secure key store./);
	});
	it('Should validate the key', () => {
		const { getPassword } = keytar;
		const permitKey = 'permit_key_'.concat('a'.repeat(97));
		(getPassword as any).mockResolvedValueOnce(permitKey);
		const { lastFrame } = render(
			<ApiKey
				args={['validate', permitKey]}
				options={{ keyAccount: 'test' }}
			/>,
		);
		expect(lastFrame()).toMatch(/Key is valid./);
	});
	it('Should read the key', async () => {
		const permitKey = 'permit_key_'.concat('a'.repeat(97));
		const { getPassword } = keytar;
		(getPassword as any).mockResolvedValueOnce(permitKey);
		const { lastFrame } = render(
			<ApiKey args={['read', permitKey]} options={{ keyAccount: 'test' }} />,
		);
		await delay(100);
		expect(lastFrame()).toMatch(/permit_key_aaaaaaa/);
	});
	it('Invalid Key', async () => {
		const permitKey = 'permit_key'.concat('a'.repeat(97));
		const { lastFrame } = render(
			<ApiKey
				args={['validate', permitKey]}
				options={{ keyAccount: 'test' }}
			/>,
		);
		await delay(50);
		expect(lastFrame()).toMatch(/Key is not valid./);
	});
});

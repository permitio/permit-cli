import React from 'react';
import { vi, expect, it, describe } from 'vitest';
import { render } from 'ink-testing-library';
import Login from '../source/commands/login';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar', () => {
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(),
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});

describe('Login Component with a retired region', () => {
	it('Should reject --region eu before any request', async () => {
		const { EU_REGION_RETIRED_MESSAGE } = await import('../source/config');
		global.fetch = vi.fn();
		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as never);
		try {
			const { lastFrame } = render(
				<Login
					options={{
						apiKey: 'permit_key_'.concat('a'.repeat(96)),
						region: 'eu',
					}}
				/>,
			);
			await delay(200);
			const squash = (s: string | undefined) => (s ?? '').replace(/\s+/g, '');
			expect(squash(lastFrame())).toContain(squash(EU_REGION_RETIRED_MESSAGE));
			expect(lastFrame()).not.toContain('Logging in');
			expect(fetch).not.toHaveBeenCalled();
			expect(keytar.setPassword).not.toHaveBeenCalled();
			expect(exitSpy).toHaveBeenCalledWith(1);
		} finally {
			exitSpy.mockRestore();
		}
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import delay from 'delay';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as keytar from 'keytar';
import { AuthProvider } from '../../source/components/AuthProvider.js';
import { loadAuthToken } from '../../source/lib/auth.js';
import { EU_REGION_RETIRED_MESSAGE, setRegion } from '../../source/config.js';
import { getMockFetchResponse } from '../utils.js';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('../../source/lib/auth.js', async () => {
	const original = await vi.importActual('../../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(),
		browserAuth: vi.fn(),
		authCallbackServer: vi.fn(),
	};
});

vi.mock('keytar', () => {
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(),
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});

const storedRegion = (region: string | null) =>
	(keytar.getPassword as any).mockImplementation(
		async (_service: string, account: string) =>
			account === 'PERMIT_REGION' ? region : demoPermitKey,
	);

// The frame wraps long lines, so compare without whitespace.
const squash = (s: string | undefined) => (s ?? '').replace(/\s+/g, '');

describe('AuthProvider with a retired region saved', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		setRegion('us');
		global.fetch = vi.fn();
		(loadAuthToken as any).mockResolvedValue(demoPermitKey);
		exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as never);
	});

	afterEach(() => {
		exitSpy.mockRestore();
		setRegion('us');
	});

	it('stops with the retired-region error before any request (stored token)', async () => {
		storedRegion('eu');

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);
		await delay(100);

		expect(squash(lastFrame())).toContain(squash(EU_REGION_RETIRED_MESSAGE));
		expect(lastFrame()).not.toContain('Child Component');
		expect(loadAuthToken).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('stops with the retired-region error before any request (--api-key)', async () => {
		storedRegion('eu');

		const { lastFrame } = render(
			<AuthProvider permit_key={demoPermitKey} scope="environment">
				<Text>Child Component</Text>
			</AuthProvider>,
		);
		await delay(100);

		expect(squash(lastFrame())).toContain(squash(EU_REGION_RETIRED_MESSAGE));
		expect(lastFrame()).not.toContain('Child Component');
		expect(fetch).not.toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('still uses the US API when us is saved', async () => {
		storedRegion('us');
		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			ok: true,
			json: async () => ({
				environment_id: 'env1',
				project_id: 'proj1',
				organization_id: 'org1',
			}),
			status: 200,
		});

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);
		await delay(200);

		expect(lastFrame()).toContain('Child Component');
		expect(fetch).toHaveBeenCalled();
		const request = (fetch as any).mock.calls[0][0];
		const url = typeof request === 'string' ? request : request.url;
		expect(url.startsWith('https://api.permit.io/')).toBe(true);
		expect(exitSpy).not.toHaveBeenCalled();
	});
});

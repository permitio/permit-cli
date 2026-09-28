import React from 'react';
import { vi, expect, it, describe, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import delay from 'delay';
import * as keytar from 'keytar';
import Login from '../source/commands/login';
import { loadRegion } from '../source/lib/auth';
import { setRegion } from '../source/config';

const secret = 'permit_key_'.concat('a'.repeat(97));

vi.mock('keytar', () => {
	const store = new Map<string, string>();
	const keytar = {
		store,
		setPassword: vi.fn(
			async (_service: string, account: string, value: string) => {
				store.set(account, value);
			},
		),
		getPassword: vi.fn(
			async (_service: string, account: string) => store.get(account) ?? null,
		),
		deletePassword: vi.fn(async (_service: string, account: string) =>
			store.delete(account),
		),
	};
	return { ...keytar, default: keytar };
});

// Stand-ins for the browser login and the environment picker, which need the
// network. They succeed right away so the test exercises what Login saves.
vi.mock('../source/components/LoginFlow.js', async () => {
	const { useEffect } = await import('react');
	return {
		default: ({
			onSuccess,
		}: {
			onSuccess: (accessToken: string, cookie: string) => void;
		}) => {
			useEffect(() => {
				onSuccess('access-token', 'cookie');
			}, [onSuccess]);
			return null;
		},
	};
});

vi.mock('../source/components/EnvironmentSelection.js', async () => {
	const { useEffect } = await import('react');
	type ActiveState = { label: string; value: string };
	return {
		default: ({
			onComplete,
		}: {
			onComplete: (
				organisation: ActiveState,
				project: ActiveState,
				environment: ActiveState,
				secret: string,
			) => void;
		}) => {
			useEffect(() => {
				onComplete(
					{ label: 'Org', value: 'org' },
					{ label: 'Proj', value: 'proj' },
					{ label: 'Env', value: 'env' },
					secret,
				);
			}, [onComplete]);
			return null;
		},
	};
});

const store = (keytar as unknown as { store: Map<string, string> }).store;

describe('Login with a retired region saved in the keychain', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		store.clear();
		store.set('PERMIT_REGION', 'eu');
		setRegion('us');
		exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as never);
	});

	afterEach(() => {
		exitSpy.mockRestore();
		setRegion('us');
	});

	it('Should replace the saved eu region with us after a successful login', async () => {
		const { lastFrame } = render(<Login options={{}} />);
		await delay(100);

		expect(lastFrame()).toContain('Logged in to Org');
		expect(store.get('PERMIT_DEFAULT_ENV')).toBe(secret);
		expect(store.get('PERMIT_REGION')).toBe('us');
		await expect(loadRegion()).resolves.toBe('us');
	});

	it('Should fail the login when the region cannot be saved', async () => {
		vi.mocked(keytar.setPassword).mockImplementationOnce(async () => {});
		vi.mocked(keytar.setPassword).mockRejectedValueOnce(
			new Error('keychain locked'),
		);

		const { lastFrame } = render(<Login options={{}} />);
		await delay(200);

		expect(lastFrame()).toContain('Failed to save the region: keychain locked');
		expect(lastFrame()).not.toContain('Logged in to');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, it, expect, afterEach, beforeEach } from 'vitest';
import delay from 'delay';
import Check from '../source/commands/pdp/check';
import * as keytar from 'keytar';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

global.fetch = vi.fn();
vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(),
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});

vi.mock('../source/hooks/useApiKeyApi.js', () => ({
	useApiKeyApi: vi.fn(() => ({
		validateApiKeyScope: vi.fn(),
	})),
}));

vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});

describe('PDP Check Component', () => {
	beforeEach(() => {
		vi.clearAllMocks(); // Ensure all mocks are cleared before each test
	});

	afterEach(() => {
		vi.restoreAllMocks(); // Restore all mocked modules after each test
	});

	it('should render with the given options and allow access', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({ allow: true }),
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
						environment_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
			demoPermitKey: demoPermitKey,
		};

		const { lastFrame } = render(<Check options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()).toContain(
			`Checking user="testUser" action="testAction" resource="testResource" at tenant="testTenant"`,
		);

		await delay(50);

		expect(lastFrame()?.toString()).toContain('ALLOWED');
	});

	it('should render with the given options and deny access', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({ allow: false }),
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
						environment_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			demoPermitKey: demoPermitKey,
			keyAccount: 'testKeyAccount',
		};

		const { lastFrame } = render(<Check options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()).toContain(
			`Checking user="testUser" action="testAction" resource="testResource" at tenant="testTenant"`,
		);

		await delay(50);

		expect(lastFrame()?.toString()).toContain('DENIED');
	});

	it('should render an error when fetch fails', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: false,
			text: async () => 'Error',
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
						environment_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		const options = {
			user: 'testUser',
			resource: 'testResource',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
			demoPermitKey: demoPermitKey,
		};

		const { lastFrame } = render(<Check options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()).toContain(
			`Checking user="testUser" action="testAction" resource="testResource" at tenant="testTenant"`,
		);

		await delay(100);

		expect(lastFrame()?.toString()).toContain('Error');
	});

	it('should render with multiple resources and allow access', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({ allow: true }),
		});

		vi.mocked(useApiKeyApi).mockReturnValue({
			validateApiKeyScope: vi.fn(() =>
				Promise.resolve({
					valid: true,
					scope: {
						project_id: 'proj1',
						environment_id: 'proj1',
					},
					error: null,
				}),
			),
		});

		const options = {
			user: 'testUser',
			resource: 'testResourceType: testResourceKey',
			action: 'testAction',
			tenant: 'testTenant',
			keyAccount: 'testKeyAccount',
			demoPermitKey: demoPermitKey,
		};

		const { lastFrame } = render(<Check options={options} />);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()).toContain(
			`Checking user="testUser" action="testAction" resource="testResourceType: testResourceKey" at\ntenant="testTenant"`,
		);

		await delay(50);

		expect(lastFrame()?.toString()).toContain('ALLOWED');
	});
});

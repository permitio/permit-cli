import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import delay from 'delay';

import useListProxy from '../../source/hooks/useListProxy.js';

// ——— mocks ———
const mockGet = vi.fn();
const mockApiClient = { GET: mockGet };
const mockAuthClient = vi.fn(() => mockApiClient);
const mockUnAuthClient = vi.fn((key: string) => mockApiClient);

vi.mock('../../source/hooks/useClient.js', () => ({
	__esModule: true,
	default: () => ({
		authenticatedApiClient: mockAuthClient,
		unAuthenticatedApiClient: mockUnAuthClient,
	}),
}));

// ——— test helper ———
function createTestComponent(
	projectId?: string,
	environmentId?: string,
	apiKey?: string,
) {
	let hookValues: any = {};
	const Test = () => {
		hookValues = useListProxy(projectId, environmentId, apiKey);
		return React.createElement(
			Text,
			null,
			'',
		);
	};
	return {
		TestComponent: Test,
		getHook: () => hookValues,
	};
}

describe('useListProxy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGet.mockReset();
	});

	it('has initial state: processing + no error + empty list', () => {
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));
		const h = getHook();
		expect(h.status).toBe('processing');
		expect(h.errorMessage).toBeNull();
		expect(h.proxies).toEqual([]);
		expect(h.totalCount).toBe(0);
	});

	it('errors when projectId/envId missing', async () => {
		const { TestComponent, getHook } = createTestComponent(undefined, 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toBe('Project ID or Environment ID is missing');
		expect(h.proxies).toEqual([]);
		expect(h.totalCount).toBe(0);
	});

	it('successfully fetches and maps proxies', async () => {
		const raw = [
			{
				key: 'k1',
				secret: { foo: 'bar' },
				name: 'proxy1',
				mapping_rules: [{ url: '/a', http_method: 'get' as const }],
				auth_mechanism: 'Bearer' as const,
			},
		];
		mockGet.mockResolvedValue({
			response: { status: 200 },
			data: raw,
			error: null,
		});

		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		const h = getHook();
		expect(h.status).toBe('done');
		expect(h.errorMessage).toBeNull();
		expect(h.totalCount).toBe(1);
		expect(h.proxies).toEqual([
			{
				key: 'k1',
				secret: JSON.stringify(raw[0].secret),
				name: 'proxy1',
				mapping_rules: [
					{
						url: '/a',
						http_method: 'get',
						resource: '',
						headers: {},
						action: undefined,
						priority: undefined,
					},
				],
				auth_mechanism: 'Bearer',
			},
		]);
	});

	it('handles API‑side error (result.error)', async () => {
		mockGet.mockResolvedValue({
			response: { status: 200 },
			data: [],
			error: { message: 'API bad' },
		});

		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		expect(getHook().status).toBe('error');
		expect(getHook().errorMessage).toBe('API bad');
	});

	it('handles unexpected HTTP status', async () => {
		mockGet.mockResolvedValue({
			response: { status: 500 },
			data: [],
			error: null,
		});

		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		expect(getHook().status).toBe('error');
		expect(getHook().errorMessage).toBe('Unexpected API status code: 500');
	});

	it('catches thrown exceptions', async () => {
		mockGet.mockImplementation(() => {
			throw new Error('Network fail');
		});

		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		expect(getHook().status).toBe('error');
		expect(getHook().errorMessage).toBe('Network fail');
	});

	it('uses authenticated client when no apiKey', async () => {
		mockGet.mockResolvedValue({
			response: { status: 200 },
			data: [],
			error: null,
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		expect(mockAuthClient).toHaveBeenCalled();
		expect(mockUnAuthClient).not.toHaveBeenCalled();
	});

	it('uses unauthenticated client when apiKey provided', async () => {
		mockGet.mockResolvedValue({
			response: { status: 200 },
			data: [],
			error: null,
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e', 'my-key');
		render(React.createElement(TestComponent, null));

		await getHook().listProxies();
		await delay(20);

		expect(mockUnAuthClient).toHaveBeenCalledWith('my-key');
		expect(mockAuthClient).not.toHaveBeenCalled();
	});

	it('respects page parameter when fetching', async () => {
		mockGet.mockResolvedValue({
			response: { status: 200 },
			data: [],
			error: null,
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		// bump to page 2
		getHook().setPage(2);
		await getHook().listProxies();
		await delay(20);

		expect(mockGet).toHaveBeenCalledWith(
			'/v2/facts/{proj_id}/{env_id}/proxy_configs',
			{ proj_id: 'p', env_id: 'e' },
			undefined,
			{ page: 2, per_page: 30 },
		);
	});
});

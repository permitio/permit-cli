import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, beforeEach, MockInstance } from 'vitest';
import delay from 'delay';
import { vi } from 'vitest';

import { useCreateProxy } from '../../source/hooks/useCreateProxy.js';
import { validateProxyConfig } from '../../source/utils/api/proxy/createutils.js';

// ——— Mocks ———
const mockPost = vi.fn();
const mockApiClient = { POST: mockPost };
const mockAuthClient = vi.fn(() => mockApiClient);
const mockUnAuthClient = vi.fn((key: string) => mockApiClient);

vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: mockAuthClient,
		unAuthenticatedApiClient: mockUnAuthClient,
	}),
}));

vi.mock('../../source/utils/api/proxy/createutils.js', () => ({
	validateProxyConfig: vi.fn(),
}));

// ——— Test helper ———
function createTestComponent(
	projectId?: string,
	environmentId?: string,
	apiKey?: string,
) {
	let hookValues: any = {};
	const Test = () => {
		hookValues = useCreateProxy(projectId, environmentId, apiKey);
		return React.createElement(
			Text,
			null,
			`Status: ${hookValues.status}, Error: ${hookValues.errorMessage ?? 'none'}`,
		);
	};
	return {
		TestComponent: Test,
		getHook: () => hookValues,
	};
}

describe('useCreateProxy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPost.mockReset();
		(validateProxyConfig as unknown as MockInstance).mockImplementation(
			() => undefined,
		);
	});

	it('has initial state processing + no error', () => {
		const { TestComponent, getHook } = createTestComponent('proj', 'env');
		render(React.createElement(TestComponent, null));
		const h = getHook();
		expect(h.status).toBe('processing');
		expect(h.errorMessage).toBeNull();
	});

	it('errors when projectId/envId missing', async () => {
		const { TestComponent, getHook } = createTestComponent(undefined, 'env');
		render(React.createElement(TestComponent, null));
		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);
		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toMatch(/Project ID or Environment ID is missing/);
	});

	it('handles validation util throwing', async () => {
		(validateProxyConfig as unknown as MockInstance).mockImplementation(() => {
			throw new Error('Bad payload');
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));
		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);
		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toBe('Bad payload');
	});

	it('successfully creates a proxy (2xx)', async () => {
		mockPost.mockResolvedValue({ response: { status: 201 }, error: null });
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		const rendered = render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		expect(mockPost).toHaveBeenCalled();
		const h = getHook();
		expect(h.status).toBe('done');
		expect(h.errorMessage).toBeNull();

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Status: done');
	});

	it('handles 422 validation errors from API', async () => {
		mockPost.mockResolvedValue({
			response: { status: 422 },
			error: { message: 'Invalid schema' },
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toBe('Invalid schema');
	});

	it('handles unexpected status codes', async () => {
		mockPost.mockResolvedValue({
			response: { status: 400 },
			error: { foo: 'bar' },
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toContain(
			'Unexpected API status code: 400: {"foo":"bar"}',
		);
	});

	it('catches thrown Error instances', async () => {
		mockPost.mockImplementation(() => {
			throw new Error('Network fail');
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toBe('Network fail');
	});

	it('catches non-Error throws', async () => {
		mockPost.mockImplementation(() => {
			throw 'String error';
		});
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		const h = getHook();
		expect(h.status).toBe('error');
		expect(h.errorMessage).toBe('String error');
	});

	it('uses authenticated client when no apiKey', async () => {
		mockPost.mockResolvedValue({ response: { status: 200 }, error: null });
		const { TestComponent, getHook } = createTestComponent('p', 'e', undefined);
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		expect(mockAuthClient).toHaveBeenCalled();
		expect(mockUnAuthClient).not.toHaveBeenCalled();
	});

	it('uses unauthenticated client when apiKey provided', async () => {
		mockPost.mockResolvedValue({ response: { status: 200 }, error: null });
		const { TestComponent, getHook } = createTestComponent(
			'p',
			'e',
			'my-api-key',
		);
		render(React.createElement(TestComponent, null));

		await getHook().createProxy({ key: 'k', mapping_rules: [] });
		await delay(50);

		expect(mockUnAuthClient).toHaveBeenCalledWith('my-api-key');
		expect(mockAuthClient).not.toHaveBeenCalled();
	});

	it('formatErrorMessage returns input unchanged', () => {
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		render(React.createElement(TestComponent, null));
		const msg = getHook().formatErrorMessage('Some message');
		expect(msg).toBe('Some message');
	});

	it('allows direct state control with setters', async () => {
		const { TestComponent, getHook } = createTestComponent('p', 'e');
		const r = render(React.createElement(TestComponent, null));

		getHook().setStatus('input');
		await delay(20);
		r.rerender(React.createElement(TestComponent, null));
		expect(r.lastFrame()).toContain('Status: input');

		getHook().setErrorMessage('Oops');
		await delay(20);
		r.rerender(React.createElement(TestComponent, null));
		expect(r.lastFrame()).toContain('Error: Oops');
	});
});

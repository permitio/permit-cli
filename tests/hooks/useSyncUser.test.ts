import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSyncUser } from '../../source/hooks/useSyncUser.js';
import { validate } from '../../source/utils/api/user/utils.js';
import delay from 'delay';

// Create mock API clients
const mockPut = vi.fn();
const mockApiClient = { PUT: mockPut };
const mockAuthClient = vi.fn(() => mockApiClient);
const mockUnAuthClient = vi.fn(() => mockApiClient);

// Mock dependencies
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: mockAuthClient,
		unAuthenticatedApiClient: mockUnAuthClient,
	}),
}));

vi.mock('../../source/utils/api/user/utils.js', () => ({
	validate: vi.fn(() => true),
}));

// Helper for creating TestComponent
const createTestComponent = (
	projectId = 'project123',
	envId = 'env123',
	apiKey,
) => {
	let hookValues = {};

	const TestComponent = () => {
		const hook = useSyncUser(projectId, envId, apiKey);
		hookValues = hook;

		return React.createElement(
			Text,
			null,
			`Status: ${hook.status}, Error: ${hook.errorMessage || 'none'}`,
		);
	};

	return { TestComponent, getHookValues: () => hookValues };
};

describe('useSyncUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPut.mockReset();
		mockAuthClient.mockClear();
		mockUnAuthClient.mockClear();
		(validate as any).mockImplementation(() => true);
	});

	it('should have correct initial state', () => {
		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		const hook = getHookValues();
		expect(hook.status).toBe('processing');
		expect(hook.errorMessage).toBe(null);
	});

	it('should successfully sync a user', async () => {
		// Setup the mock response
		mockPut.mockResolvedValue({
			response: { status: 200 },
			error: null,
		});

		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', {
			key: 'user123',
			email: 'test@example.com',
		});

		await delay(200);

		expect(mockPut).toHaveBeenCalled();
		expect(getHookValues().status).toBe('done');
		expect(getHookValues().errorMessage).toBe(null);

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Status: done');
		expect(rendered.lastFrame()).toContain('Error: none');
	});

	it('should handle validation errors', async () => {
		(validate as any).mockImplementation(() => false);

		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toContain('Invalid user ID');

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Invalid user ID');
	});

	it('should handle API errors with detailed validation messages (422)', async () => {
		mockPut.mockResolvedValue({
			response: { status: 422 },
			error: { detail: [{ msg: 'Email must be valid' }] },
		});

		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toContain(
			'Validation Error: Email must be valid',
		);

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Email must be valid');
	});

	it('should handle API errors with details but no message', async () => {
		mockPut.mockResolvedValue({
			response: { status: 422 },
			error: { detail: [{ foo: 'bar' }] },
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toContain('[{"foo":"bar"}]');
	});

	it('should handle API errors with message property', async () => {
		mockPut.mockResolvedValue({
			response: { status: 400 },
			error: { message: 'Bad Request' },
		});

		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toBe('Bad Request');

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Bad Request');
	});

	it('should handle API errors without message property', async () => {
		mockPut.mockResolvedValue({
			response: { status: 400 },
			error: { foo: 'bar' },
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toContain('API Error: {"foo":"bar"}');
	});

	it('should handle unexpected status codes', async () => {
		mockPut.mockResolvedValue({
			response: { status: 418 }, // I'm a teapot
			error: null,
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toContain(
			'Unexpected status code 418',
		);
	});

	it('should handle exceptions with nested error property', async () => {
		mockPut.mockImplementation(() => {
			throw { error: { message: 'Nested error message' } };
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toBe('Nested error message');
	});

	it('should handle Error instances', async () => {
		mockPut.mockImplementation(() => {
			throw new Error('Error instance message');
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toBe('Error instance message');
	});

	it('should handle non-Error objects', async () => {
		mockPut.mockImplementation(() => {
			throw 'String error';
		});

		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(getHookValues().status).toBe('error');
		expect(getHookValues().errorMessage).toBe('String error');
	});

	it('should use authenticated client when no apiKey provided', async () => {
		mockPut.mockResolvedValue({
			response: { status: 200 },
			error: null,
		});

		const { TestComponent, getHookValues } = createTestComponent(
			'project123',
			'env123',
			undefined,
		);
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(mockAuthClient).toHaveBeenCalled();
		expect(mockUnAuthClient).not.toHaveBeenCalled();
	});

	it('should use unauthenticated client when apiKey provided', async () => {
		mockPut.mockResolvedValue({
			response: { status: 200 },
			error: null,
		});

		const { TestComponent, getHookValues } = createTestComponent(
			'project123',
			'env123',
			'api-key-123',
		);
		render(React.createElement(TestComponent, null));

		await getHookValues().syncUser('user123', { key: 'user123' });
		await delay(200);

		expect(mockUnAuthClient).toHaveBeenCalledWith('api-key-123');
		expect(mockAuthClient).not.toHaveBeenCalled();
	});

	it('should format tenant not found error messages', async () => {
		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		const formattedMessage = getHookValues().formatErrorMessage(
			"could not find 'Tenant' with id='test-tenant'",
		);

		expect(formattedMessage).toContain("Tenant not found: 'test-tenant'");
		expect(formattedMessage).toContain('Please create this tenant');
	});

	it('should pass through non-tenant error messages', async () => {
		const { TestComponent, getHookValues } = createTestComponent();
		render(React.createElement(TestComponent, null));

		const formattedMessage = getHookValues().formatErrorMessage(
			'Some other error message',
		);

		expect(formattedMessage).toBe('Some other error message');
	});

	it('should allow direct state management with setStatus', async () => {
		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		getHookValues().setStatus('input');
		await delay(50);

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Status: input');
	});

	it('should allow direct state management with setErrorMessage', async () => {
		const { TestComponent, getHookValues } = createTestComponent();
		const rendered = render(React.createElement(TestComponent, null));

		getHookValues().setErrorMessage('Custom error');
		await delay(50);

		rendered.rerender(React.createElement(TestComponent, null));
		expect(rendered.lastFrame()).toContain('Error: Custom error');
	});
});

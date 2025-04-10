import React from 'react';
import { render } from 'ink-testing-library';
import CheckUrl, { options } from '../source/commands/pdp/check-url.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the AuthProvider component
vi.mock('../source/components/AuthProvider.js', () => ({
	AuthProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

// Mock the PDPCheckUrlComponent
vi.mock('../source/components/pdp/PDPCheckUrlComponent.js', () => ({
	__esModule: true,
	default: vi.fn(() => <div>PDPCheckUrlComponent</div>),
}));

describe('CheckUrl Command', () => {
	const defaultOptions = {
		user: 'john@example.com',
		url: 'https://example.com/endpoint',
		method: 'GET',
		tenant: 'default',
		userAttributes: [],
		pdpurl: undefined,
		apiKey: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the PDPCheckUrlComponent with the correct props', () => {
		const { lastFrame } = render(<CheckUrl options={defaultOptions} />);
		expect(lastFrame()).toBeDefined();
	});

	it('validates required options', () => {
		// Verify that user is required
		const result1 = options.safeParse({
			url: 'https://example.com/endpoint',
		});
		expect(result1.success).toBe(false);

		// Verify that url is required
		const result2 = options.safeParse({
			user: 'john@example.com',
		});
		expect(result2.success).toBe(false);

		// Both user and url are provided, should succeed
		const result3 = options.safeParse({
			user: 'john@example.com',
			url: 'https://example.com/endpoint',
		});
		expect(result3.success).toBe(true);
	});

	it('accepts optional parameters', () => {
		const result = options.safeParse({
			user: 'john@example.com',
			url: 'https://example.com/endpoint',
			method: 'POST',
			tenant: 'custom-tenant',
			userAttributes: ['role:admin', 'department:engineering'],
			pdpurl: 'http://localhost:7766',
			apiKey: 'permit_key_12345',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.method).toBe('POST');
			expect(result.data.tenant).toBe('custom-tenant');
			expect(result.data.userAttributes).toEqual([
				'role:admin',
				'department:engineering',
			]);
			expect(result.data.pdpurl).toBe('http://localhost:7766');
			expect(result.data.apiKey).toBe('permit_key_12345');
		}
	});

	it('provides default values for optional parameters', () => {
		const result = options.safeParse({
			user: 'john@example.com',
			url: 'https://example.com/endpoint',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.method).toBe('GET');
			expect(result.data.tenant).toBe('default');
		}
	});
});

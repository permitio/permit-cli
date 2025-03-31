import React from 'react';
import { Text, Box } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import User, { options as userOptions } from '../source/commands/api/sync/user';
import { type infer as zInfer } from 'zod';

// Mock the APISyncUserComponent to avoid actual API calls
vi.mock('../source/components/api/sync/APISyncUserComponent.js', () => ({
	default: ({ options }: { options: any }) => (
		<Box flexDirection="column">
			<Text>Mocked APISyncUserComponent</Text>
			<Text>key: {options.key || 'undefined'}</Text>
			<Text>email: {options.email || 'undefined'}</Text>
			<Text>firstName: {options.firstName || 'undefined'}</Text>
			<Text>lastName: {options.lastName || 'undefined'}</Text>
			<Text>apiKey: {options.apiKey || 'undefined'}</Text>
			<Text>
				attributes:{' '}
				{options.attributes ? JSON.stringify(options.attributes) : '[]'}
			</Text>
			<Text>roles: {options.roles ? JSON.stringify(options.roles) : '[]'}</Text>
		</Box>
	),
}));

// Mock the AuthProvider component
vi.mock('../source/components/AuthProvider.js', () => ({
	AuthProvider: ({
		children,
		scope,
		permit_key,
	}: {
		children: React.ReactNode;
		scope: string;
		permit_key?: string;
	}) => (
		<Box flexDirection="column">
			<Text>Auth Provider</Text>
			<Text>scope: {scope}</Text>
			<Text>permit_key: {permit_key || 'undefined'}</Text>
			{children}
		</Box>
	),
}));

// Helper to create valid options that match the schema
const createOptions = (
	partialOptions: Partial<zInfer<typeof userOptions>> = {},
): zInfer<typeof userOptions> => {
	return {
		key: 'default-user-id',
		...partialOptions,
	} as zInfer<typeof userOptions>;
};

describe('User Command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should render with default options', () => {
		const options = createOptions();

		const { lastFrame } = render(<User options={options} />);

		// Check that AuthProvider is rendered
		expect(lastFrame()).toContain('Auth Provider');
		expect(lastFrame()).toContain('scope: environment');
		expect(lastFrame()).toContain('permit_key: undefined');

		// Check that APISyncUserComponent is rendered with options
		expect(lastFrame()).toContain('Mocked APISyncUserComponent');
		expect(lastFrame()).toContain('key: default-user-id');
	});

	it('should pass apiKey to AuthProvider when provided', () => {
		const options = createOptions({ apiKey: 'test-api-key' });

		const { lastFrame } = render(<User options={options} />);

		// Check that the API key is passed to AuthProvider
		expect(lastFrame()).toContain('permit_key: test-api-key');
		expect(lastFrame()).toContain('apiKey: test-api-key');
	});

	it('should pass all options to APISyncUserComponent', () => {
		const options = createOptions({
			apiKey: 'test-api-key',
			key: 'test-user-id',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
			attributes: ['department:engineering', 'level:senior'],
			roles: ['admin', 'tenant1/editor'],
		});

		const { lastFrame } = render(<User options={options} />);

		// Check that all options are passed to APISyncUserComponent
		expect(lastFrame()).toContain('key: test-user-id');
		expect(lastFrame()).toContain('email: user@example.com');
		expect(lastFrame()).toContain('firstName: Test');
		expect(lastFrame()).toContain('lastName: User');
		expect(lastFrame()).toContain(
			'attributes: ["department:engineering","level:senior"]',
		);
		expect(lastFrame()).toContain('roles: ["admin","tenant1/editor"]');
	});

	describe('Options schema validation', () => {
		it('should validate key field', () => {
			const result = userOptions.safeParse({ key: 'valid-key' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.key).toBe('valid-key');
			}
		});

		it('should accept empty key field as it is optional', () => {
			const result = userOptions.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should validate optional email field', () => {
			const result = userOptions.safeParse({
				key: 'valid-key',
				email: 'test@example.com',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('test@example.com');
			}
		});

		it('should validate optional firstName and lastName fields', () => {
			const result = userOptions.safeParse({
				key: 'valid-key',
				firstName: 'John',
				lastName: 'Doe',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstName).toBe('John');
				expect(result.data.lastName).toBe('Doe');
			}
		});

		it('should validate attributes array with proper format', () => {
			const result = userOptions.safeParse({
				key: 'valid-key',
				attributes: ['key1:value1', 'key2:value2'],
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.attributes).toEqual(['key1:value1', 'key2:value2']);
			}
		});

		it('should reject invalid attribute format', () => {
			const result = userOptions.safeParse({
				key: 'valid-key',
				attributes: ['invalid-format'],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid format');
			}
		});

		describe('should validate roles in different formats', () => {
			it('should validate simple role', () => {
				const result = userOptions.safeParse({
					key: 'valid-key',
					roles: ['admin'],
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.roles).toEqual(['admin']);
				}
			});

			it('should validate tenant/role format', () => {
				const result = userOptions.safeParse({
					key: 'valid-key',
					roles: ['tenant1/editor'],
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.roles).toEqual(['tenant1/editor']);
				}
			});

			it('should validate resourceInstance#role format', () => {
				const result = userOptions.safeParse({
					key: 'valid-key',
					roles: ['resource:instance#viewer'],
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.roles).toEqual(['resource:instance#viewer']);
				}
			});

			it('should validate tenant/resourceInstance#role format', () => {
				const result = userOptions.safeParse({
					key: 'valid-key',
					roles: ['tenant1/resource:instance#owner'],
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.roles).toEqual([
						'tenant1/resource:instance#owner',
					]);
				}
			});

			it('should reject invalid role formats', () => {
				const result = userOptions.safeParse({
					key: 'valid-key',
					roles: ['invalid@format'],
				});

				expect(result.success).toBe(false);
			});
		});

		it('should accept multiple valid options together', () => {
			const result = userOptions.safeParse({
				apiKey: 'api-key-123',
				key: 'user-123',
				email: 'user@example.com',
				firstName: 'Test',
				lastName: 'User',
				attributes: ['department:engineering', 'level:senior'],
				roles: ['admin', 'tenant1/editor', 'project:123#viewer'],
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.apiKey).toBe('api-key-123');
				expect(result.data.key).toBe('user-123');
				expect(result.data.email).toBe('user@example.com');
				expect(result.data.firstName).toBe('Test');
				expect(result.data.lastName).toBe('User');
				expect(result.data.attributes).toEqual([
					'department:engineering',
					'level:senior',
				]);
				expect(result.data.roles).toEqual([
					'admin',
					'tenant1/editor',
					'project:123#viewer',
				]);
			}
		});
	});
});

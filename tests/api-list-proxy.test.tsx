import React from 'react';
import { Text, Box } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ListProxy, {
	options as listOptions,
} from '../source/commands/api/list/proxy';
import type { infer as zInfer } from 'zod';

// Mock the APIListProxyComponent to avoid actual API calls
vi.mock('../source/components/api/proxy/APIListProxyComponent.js', () => ({
	default: ({ options }: { options: any }) => (
		<Box flexDirection="column">
			<Text>Mocked APIListProxyComponent</Text>
			<Text>apiKey: {options.apiKey ?? 'undefined'}</Text>
			<Text>expandKey: {options.expandKey.toString()}</Text>
			<Text>page: {options.page}</Text>
			<Text>perPage: {options.perPage}</Text>
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
			<Text>permit_key: {permit_key ?? 'undefined'}</Text>
			{children}
		</Box>
	),
}));

// Helper to create valid options matching the schema
type Options = zInfer<typeof listOptions>;
const createOptions = (partial: Partial<Options> = {}): Options =>
	({
		apiKey: undefined,
		expandKey: false,
		page: 1,
		perPage: 30,
		...partial,
	}) as Options;

describe('List Proxy Command', () => {
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should render with default options', () => {
		const options = createOptions();
		const { lastFrame } = render(<ListProxy options={options} />);

		expect(lastFrame()).toContain('Auth Provider');
		expect(lastFrame()).toContain('scope: environment');
		expect(lastFrame()).toContain('permit_key: undefined');

		expect(lastFrame()).toContain('Mocked APIListProxyComponent');
		expect(lastFrame()).toContain('apiKey: undefined');
		expect(lastFrame()).toContain('expandKey: false');
		expect(lastFrame()).toContain('page: 1');
		expect(lastFrame()).toContain('perPage: 30');
	});

	it('should pass apiKey to AuthProvider when provided', () => {
		const options = createOptions({ apiKey: 'test-key' });
		const { lastFrame } = render(<ListProxy options={options} />);

		expect(lastFrame()).toContain('permit_key: test-key');
		expect(lastFrame()).toContain('apiKey: test-key');
	});

	it('should pass all options to APIListProxyComponent', () => {
		const custom: Options = {
			apiKey: 'test-key',
			expandKey: true,
			page: 5,
			perPage: 50,
			all: true,
		};
		const options = createOptions(custom);
		const { lastFrame } = render(<ListProxy options={options} />);

		expect(lastFrame()).toContain('apiKey: test-key');
		expect(lastFrame()).toContain('expandKey: true');
		expect(lastFrame()).toContain('page: 5');
		expect(lastFrame()).toContain('perPage: 50');
	});

	describe('Options schema validation', () => {
		it('should accept defaults with safeParse', () => {
			const result = listOptions.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.expandKey).toBe(false);
				expect(result.data.page).toBe(1);
				expect(result.data.perPage).toBe(30);
			}
		});

		it('should validate boolean expandKey', () => {
			const good = listOptions.safeParse({ expandKey: true });
			expect(good.success).toBe(true);
			const bad = listOptions.safeParse({ expandKey: 'yes' });
			expect(bad.success).toBe(false);
		});

		it('should validate page and perPage as numbers', () => {
			const good = listOptions.safeParse({ page: 2, perPage: 20 });
			expect(good.success).toBe(true);
			const badPage = listOptions.safeParse({ page: 'two' });
			expect(badPage.success).toBe(false);
			const badPer = listOptions.safeParse({ perPage: 'ten' });
			expect(badPer.success).toBe(false);
		});

		it('should accept multiple valid options together', () => {
			const payload = {
				all: false,
				apiKey: 'a',
				expandKey: true,
				page: 3,
				perPage: 15,
			};
			const result = listOptions.safeParse(payload);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toEqual(payload);
		});
	});
});

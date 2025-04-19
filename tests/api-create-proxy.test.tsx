import React from 'react';
import { Text, Box } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Proxy, {
	options as proxyOptions,
} from '../source/commands/api/create/proxy';
import { type infer as zInfer } from 'zod';

// Mock the APICreateProxyComponent to avoid actual API calls
vi.mock('../source/components/api/proxy/APICreateProxyComponent', () => ({
	default: ({ options }: { options: any }) => (
		<Box flexDirection="column">
			<Text>Mocked APICreateProxyComponent</Text>
			<Text>apiKey: {options.apiKey || 'undefined'}</Text>
			<Text>secret: {options.secret || 'undefined'}</Text>
			<Text>key: {options.key || 'undefined'}</Text>
			<Text>name: {options.name || 'undefined'}</Text>
			<Text>authMechanism: {options.authMechanism || 'undefined'}</Text>
			<Text>
				mappingRules:{' '}
				{options.mappingRules ? JSON.stringify(options.mappingRules) : '[]'}
			</Text>
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

// Helper to create valid options matching the schema
type Options = zInfer<typeof proxyOptions>;
const createOptions = (partialOptions: Partial<Options> = {}): Options =>
	({
		apiKey: undefined,
		projId: undefined,
		envId: undefined,
		secret: undefined,
		key: 'default-key',
		name: 'default-name',
		authMechanism: 'Bearer',
		mappingRules: undefined,
		mappingRuleMethod: undefined,
		mappingRuleUrl: undefined,
		mappingRuleResource: undefined,
		mappingRuleAction: undefined,
		mappingRulePriority: undefined,
		mappingRuleHeaders: undefined,
		mappingRuleUrlType: undefined,
		...partialOptions,
	}) as Options;

describe('Proxy Command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should render with default options', () => {
		const options = createOptions();
		const { lastFrame } = render(<Proxy options={options} />);

		// AuthProvider rendered
		expect(lastFrame()).toContain('Auth Provider');
		expect(lastFrame()).toContain('scope: environment');
		expect(lastFrame()).toContain('permit_key: undefined');

		// APICreateProxyComponent rendered with defaults
		expect(lastFrame()).toContain('Mocked APICreateProxyComponent');
		expect(lastFrame()).toContain('key: default-key');
		expect(lastFrame()).toContain('name: default-name');
		expect(lastFrame()).toContain('authMechanism: Bearer');
		expect(lastFrame()).toContain('mappingRules: []');
	});

	it('should pass apiKey to AuthProvider when provided', () => {
		const options = createOptions({ apiKey: 'test-api-key' });
		const { lastFrame } = render(<Proxy options={options} />);

		expect(lastFrame()).toContain('permit_key: test-api-key');
		expect(lastFrame()).toContain('apiKey: test-api-key');
	});

	it('should pass all options to APICreateProxyComponent', () => {
		const fullOptions: Options = {
			apiKey: 'test-api-key',
			secret: 'supersecret',
			key: 'proxy-key',
			name: 'My Proxy',
			authMechanism: 'Basic',
			mappingRules: ['http://example.com|get|resource|{}|action|1'],
		};
		const options = createOptions(fullOptions);
		const { lastFrame } = render(<Proxy options={options} />);

		expect(lastFrame()).toContain('apiKey: test-api-key');
		expect(lastFrame()).toContain('secret: supersecret');
		expect(lastFrame()).toContain('key: proxy-key');
		expect(lastFrame()).toContain('name: My Proxy');
		expect(lastFrame()).toContain('authMechanism: Basic');
		expect(lastFrame()).toContain(
			'mappingRules: ["http://example.com|get|resource|{}|action|1"]',
		);
	});

	describe('Options schema validation', () => {
		it('should validate key field format', () => {
			const result = proxyOptions.safeParse({ key: 'validKey-123' });
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.key).toBe('validKey-123');
		});

		it('should accept empty optional fields', () => {
			const result = proxyOptions.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should validate authMechanism values', () => {
			const good = proxyOptions.safeParse({
				key: 'k',
				authMechanism: 'Headers',
			});
			expect(good.success).toBe(true);

			const bad = proxyOptions.safeParse({
				key: 'k',
				authMechanism: 'OAuth',
			});
			expect(bad.success).toBe(false);
		});

		it('should validate mappingRules format', () => {
			const validRule = 'post|https://api.test.com|res|act|10|{X:1}|regex';
			const result = proxyOptions.safeParse({
				key: 'k',
				mappingRules: [validRule],
			});
			expect(result.success).toBe(true);

			const invalid = proxyOptions.safeParse({
				key: 'k',
				mappingRules: ['bad-format'],
			});
			expect(invalid.success).toBe(false);
		});

		it('should accept multiple valid options together', () => {
			const payload = {
				apiKey: 'api-1',
				secret: 'sec',
				key: 'k1',
				name: 'Name',
				authMechanism: 'Bearer',
				mappingRules: [],
			};
			const result = proxyOptions.safeParse(payload);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(payload);
			}
		});
	});
});

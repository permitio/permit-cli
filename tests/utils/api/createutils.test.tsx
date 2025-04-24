import { describe, it, expect } from 'vitest';
import {
	validateProxyConfig,
	ProxyConfigOptions,
} from '../../../source/utils/api/proxy/createutils';

const baseConfig: ProxyConfigOptions = {
	key: 'valid-key',
	secret: 'super-secret',
	name: 'My Proxy',
	auth_mechanism: 'Bearer',
};

describe('validateProxyConfig', () => {
	it('passes with valid config', () => {
		expect(validateProxyConfig(baseConfig)).toBe(true);
	});

	it('throws if key is invalid', () => {
		expect(() =>
			validateProxyConfig({ ...baseConfig, key: 'invalid key!' }),
		).toThrow('Validation Error: Invalid key');
	});

	it('throws if secret is missing or empty', () => {
		expect(() =>
			validateProxyConfig({ ...baseConfig, secret: '' }),
		).toThrow(
			'Validation Error: Bearer secret must be a non-empty string',
		);
	});

	it('throws if auth_mechanism is invalid', () => {
		expect(() =>
			validateProxyConfig({ ...baseConfig, auth_mechanism: 'invalid' as any }),
		).toThrow(
			'Validation Error: auth_mechanism must be one of Bearer, Basic, or Headers',
		);
	});

	it('throws if mapping_rules is not an array', () => {
		expect(() =>
			validateProxyConfig({ ...baseConfig, mapping_rules: {} as any }),
		).toThrow('Validation Error: mapping_rules must be an array');
	});

	describe('mapping_rules validation', () => {
		it('throws if url is missing or empty', () => {
			expect(() =>
				validateProxyConfig({
					...baseConfig,
					mapping_rules: [
						{
							url: '',
							http_method: 'get',
							resource: 'res',
							headers: {},
						},
					],
				}),
			).toThrow(/mapping_rules\[0\]\.url is required/);
		});

		it('throws if url is invalid', () => {
			expect(() =>
				validateProxyConfig({
					...baseConfig,
					mapping_rules: [
						{
							url: 'not-a-url',
							http_method: 'get',
							resource: 'res',
							headers: {},
						},
					],
				}),
			).toThrow(/mapping_rules\[0\]\.url is invalid/);
		});

		it('throws if resource is missing or invalid', () => {
			expect(() =>
				validateProxyConfig({
					...baseConfig,
					mapping_rules: [
						{
							url: 'http://valid.com',
							http_method: 'get',
							resource: '',
							headers: {},
						},
					],
				}),
			).toThrow(/mapping_rules\[0\]\.resource is invalid \(''\)/);
		});

		it('throws if headers is not an object', () => {
			expect(() =>
				validateProxyConfig({
					...baseConfig,
					mapping_rules: [
						{
							url: 'http://valid.com',
							http_method: 'get',
							resource: 'res',
							headers: [] as any,
						},
					],
				}),
			).toThrow(/mapping_rules\[0\]\.headers must be an object/);
		});

		it('throws if header value is not a string', () => {
			expect(() =>
				validateProxyConfig({
					...baseConfig,
					mapping_rules: [
						{
							url: 'http://valid.com',
							http_method: 'get',
							resource: 'res',
							headers: {
								Authorization: 123 as any,
							},
						},
					],
				}),
			).toThrow(/headers\['Authorization'\] must be a string/);
		});

		it('passes with valid mapping_rules', () => {
			expect(validateProxyConfig({
				...baseConfig,
				mapping_rules: [
					{
						url: 'http://example.com',
						http_method: 'post',
						resource: 'my-resource',
						headers: {
							Authorization: 'Bearer token',
						},
					},
				],
			}), 'Expected valid mapping_rules to pass validation').toBe(true);
		});
	});
});

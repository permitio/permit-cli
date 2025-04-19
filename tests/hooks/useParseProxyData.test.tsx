import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import delay from 'delay';

import useParseProxyData from '../../source/hooks/useParseProxyData.js';

type UpdateKeyFn = (newKey: string) => void;

function TestComponent({
	options,
	onUpdateKey,
}: {
	options: any;
	onUpdateKey?: (fn: UpdateKeyFn) => void;
}) {
	const { payload, parseError, updatePayloadKey } = useParseProxyData(options);

	if (onUpdateKey) {
		onUpdateKey(updatePayloadKey);
	}

	return (
		<>
			<Text>{`key: ${payload.key}`}</Text>
			<Text>{`secret: ${payload.secret}`}</Text>
			<Text>{`name: ${payload.name}`}</Text>
			<Text>{`mapping_rules: ${JSON.stringify(payload.mapping_rules)}`}</Text>
			<Text>{`authMechanism: ${payload.auth_mechanism}`}</Text>
			<Text>{`parseError: ${parseError ?? 'null'}`}</Text>
		</>
	);
}

describe('useParseProxyData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('basic payload defaults', () => {
		it('returns empty/default fields when options is {}', () => {
			const { lastFrame } = render(<TestComponent options={{}} />);
			const frame = lastFrame()!.replace(/\n/g, '');
			expect(frame).toContain('key:'); 
			expect(frame).toContain('secret:');
			expect(frame).toContain('name:');
			expect(frame).toContain('mapping_rules: []');
			expect(frame).toContain('authMechanism: Bearer');
			expect(frame).toContain('parseError: null');
		});
	});

	describe('mappingRules array parsing', () => {
		it('parses a full rule with all parts', () => {
			const opts = {
				key: 'k',
				mappingRules: [
					'get|https://api.example.com|users|getUsers|10|{Authorization:Bearer abc,X-Custom:v7}|regex',
				],
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain(
				`"http_method":"get","url":"https://api.example.com","resource":"users"`,
			);
			expect(frame).toContain(`"action":"getUsers"`);
			expect(frame).toContain(`"priority":10`);
			expect(frame).toContain(`"Authorization":"Bearerabc"`);
			expect(frame).toContain(`"X-Custom":"v7"`);
			expect(frame).toContain(`"url_type":"regex"`);
			expect(frame).toContain('parseError:null');
		});

		it('parses a minimal rule with only required parts', () => {
			const opts = {
				key: 'k',
				mappingRules: ['POST|/items|items'],
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain(`"http_method":"post"`);
			expect(frame).toContain(`"url":"/items"`);
			expect(frame).toContain(`"resource":"items"`);
			expect(frame).toContain(`"headers":{}`);
			expect(frame).not.toContain(`"action":`);
			expect(frame).not.toContain(`"priority":`);
			expect(frame).not.toContain(`"url_type":`);
			expect(frame).toContain('parseError:null');
		});

		it('treats invalid JSON headers as empty object', () => {
			const opts = {
				key: 'k',
				mappingRules: ['DELETE|/x|x|act|notanumber|{bad json}|none'],
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain(`"http_method":"delete"`);
			expect(frame).toContain(`"action":"act"`);
			expect(frame).toContain(`"headers":{}`);
			expect(frame).not.toContain(`"priority":`);
			expect(frame).not.toContain(`"url_type":`);
			expect(frame).toContain('parseError:null');
		});

		it('sets parseError and leaves mapping_rules empty when a required part is missing', () => {
			const opts = {
				key: 'k',
				mappingRules: ['POST|/only'],
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain('mapping_rules:[]');
			expect(frame).toMatch(/parseError:.*mustincludearesource/);
		});
	});

	describe('individual mapping rule flags', () => {
		it('parses individual flags into a rule correctly', () => {
			const opts = {
				key: 'k',
				mappingRuleMethod: 'GET',
				mappingRuleUrl: '/items',
				mappingRuleResource: 'items',
				mappingRuleAction: 'view',
				mappingRulePriority: 3,
				mappingRuleHeaders: ['A:B', 'C:D'],
				mappingRuleUrlType: 'regex',
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain(`"http_method":"get"`);
			expect(frame).toContain(`"url":"/items"`);
			expect(frame).toContain(`"resource":"items"`);
			expect(frame).toContain(`"action":"view"`);
			expect(frame).toContain(`"priority":3`);
			expect(frame).toContain(`"A":"B"`);
			expect(frame).toContain(`"C":"D"`);
			expect(frame).toContain(`"url_type":"regex"`);
			expect(frame).toContain('parseError:null');
		});

		it('handles invalid resource format in individual flags', () => {
			const opts = {
				key: 'k',
				mappingRuleMethod: 'GET',
				mappingRuleUrl: '/bad',
				mappingRuleResource: 'bad resource', // space not allowed
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!.replace(/\s+/g, '');
			expect(frame).toContain('mapping_rules:[]');
			// error collapsed → match 'Invalidresource'
			expect(frame).toMatch(/parseError:.*Invalidresource/);
		});
	});

	describe('combining mappingRules and individual flags', () => {
		it('includes both array-based rules and flag-based rules', () => {
			const opts = {
				key: 'combo',
				mappingRules: ['GET|/a|a'],
				mappingRuleMethod: 'POST',
				mappingRuleUrl: '/b',
				mappingRuleResource: 'b',
			};
			const { lastFrame } = render(<TestComponent options={opts} />);
			const frame = lastFrame()!;
			const count = (frame.match(/"http_method":/g) || []).length;
			expect(count).toBe(2);
			expect(frame).toContain('"http_method":"get"');
			expect(frame).toContain('"http_method":"post"');
			expect(frame).toContain('parseError: null');
		});
	});

	describe('updatePayloadKey', () => {
		it('allows changing the key via updatePayloadKey', async () => {
			let updateFn: UpdateKeyFn | undefined;
			const opts = { key: 'orig' };
			const { lastFrame, rerender } = render(
				<TestComponent
					options={opts}
					onUpdateKey={fn => {
						updateFn = fn;
					}}
				/>,
			);

			expect(lastFrame()).toContain('key: orig');

			updateFn!('new-key');
			await delay(0);

			rerender(
				<TestComponent
					options={opts}
					onUpdateKey={fn => {
						updateFn = fn;
					}}
				/>,
			);
			expect(lastFrame()).toContain('key: new-key');
		});
	});
});

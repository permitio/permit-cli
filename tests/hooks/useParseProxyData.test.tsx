// File: tests/hooks/useParseProxyData.test.ts
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import delay from 'delay';

import useParseProxyData from '../../source/hooks/useParseProxyData.js';

type UpdateKeyFn = (newKey: string) => void;

// A helper TestComponent that exposes hook output via Text
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

	return React.createElement(
		React.Fragment,
		null,
		React.createElement(Text, null, `key: ${payload.key}`),
		React.createElement(Text, null, `secret: ${payload.secret}`),
		React.createElement(Text, null, `name: ${payload.name}`),
		React.createElement(
			Text,
			null,
			`mapping_rules: ${JSON.stringify(payload.mapping_rules)}`,
		),
		React.createElement(Text, null, `authMechanism: ${payload.auth_mechanism}`),
		React.createElement(Text, null, `parseError: ${parseError ?? 'null'}`),
	);
}

describe('useParseProxyData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('basic payload defaults', () => {
		it('returns empty/default fields when options is {}', async () => {
			const { lastFrame } = render(
				React.createElement(TestComponent, { options: {} }),
			);

			// flatten newlines so we don't miss any substrings
			const frame = lastFrame()!.replace(/\n/g, '');
			expect(frame).toContain('key:'); // no trailing space
			expect(frame).toContain('secret:');
			expect(frame).toContain('name:');
			expect(frame).toContain('mapping_rules: []');
			expect(frame).toContain('authMechanism: Bearer');
			expect(frame).toContain('parseError: null');
		});
	});

	describe('mapping_rules parsing', () => {
		it('parses minimal rule "url|method"', async () => {
			const opts = {
				key: 'k',
				mapping_rules: ['/path|GET'],
			};
			const { lastFrame } = render(
				React.createElement(TestComponent, { options: opts }),
			);
			const frame = lastFrame();
			expect(frame).toContain('"url":"/path"');
			expect(frame).toContain('"http_method":"get"');
			expect(frame).toContain('"resource":""');
			expect(frame).toContain('"headers":{}');
			// undefined fields are omitted in JSON.stringify
			expect(frame).toContain('parseError: null');
		});

		it('parses full rule with all parts', async () => {
			const opts = {
				key: 'k',
				mapping_rules: ['/a|POST|/res|{"h":"v"}|actionX|42'],
			};
			const { lastFrame } = render(
				React.createElement(TestComponent, { options: opts }),
			);
			// flatten to avoid the "actionX" splitting across a line break
			const frame = lastFrame()!.replace(/\n/g, '');
			expect(frame).toContain('"url":"/a"');
			expect(frame).toContain('"http_method":"post"');
			expect(frame).toContain('"resource":"/res"');
			expect(frame).toContain('"headers":{"h":"v"}');
			expect(frame).toContain('"action":"actionX"');
			expect(frame).toContain('"priority":42');
			expect(frame).toContain('parseError: null');
		});

		it('treats invalid JSON headers as empty object', async () => {
			const opts = {
				key: 'k',
				mapping_rules: ['/x|put||{bad json}|act|notanumber'],
			};
			const { lastFrame } = render(
				React.createElement(TestComponent, { options: opts }),
			);
			const frame = lastFrame();
			expect(frame).toContain('"url":"/x"');
			expect(frame).toContain('"http_method":"put"');
			expect(frame).toContain('"headers":{}');
			// "action" gets set to string 'act'
			expect(frame).toContain('"action":"act"');
			// non-numeric priority becomes omitted
			expect(frame).not.toContain('priority');
			expect(frame).toContain('parseError: null');
		});

		it('sets parseError when url or method is missing', async () => {
			const opts = {
				key: 'k',
				mapping_rules: ['onlyurl|'],
			};
			const { lastFrame } = render(
				React.createElement(TestComponent, { options: opts }),
			);
			const frame = lastFrame();
			expect(frame).toContain(
				'Mapping rule at index 0 must include at least "url" and "http_method".',
			);
			// payload.mapping_rules remains empty on error
			expect(frame).toContain('mapping_rules: []');
		});
	});

	describe('updatePayloadKey', () => {
		it('allows changing the key via updatePayloadKey', async () => {
			let updateFn: UpdateKeyFn | undefined;
			const opts = { key: 'orig' };
			const { lastFrame, rerender } = render(
				React.createElement(TestComponent, {
					options: opts,
					onUpdateKey: fn => {
						updateFn = fn;
					},
				}),
			);

			// should start with original key
			expect(lastFrame()).toContain('key: orig');

			// call the updater
			updateFn!('new-key');
			await delay(0);

			// rerender to pick up the mutation
			rerender(
				React.createElement(TestComponent, {
					options: opts,
					onUpdateKey: fn => {
						updateFn = fn;
					},
				}),
			);
			expect(lastFrame()).toContain('key: new-key');
		});
	});
});

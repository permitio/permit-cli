import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import Index from '../source/commands/index';
import delay from 'delay';
import * as keytar from 'keytar';
import { getMockFetchResponse } from './utils';

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

const originalVersions = process.versions;
beforeEach(() => {
	vi.resetAllMocks();
	Object.defineProperty(process, 'versions', {
		value: { ...originalVersions },
		writable: true,
	});
});

describe('index file', () => {
	it('the index file should render', async () => {
		const { lastFrame } = render(<Index />);
		await delay(100);
		const finalFrame = lastFrame()?.toString();
		expect(finalFrame).toMatch(
			/Run this command with --help for more information/,
		);
		expect(finalFrame).toMatch(
			/You're not logged in. Run `permit login` to activate all CLI features./,
		);
	});

	describe('Node Version Warnings', () => {
		const testCases = [
			{ version: '18.0.0', shouldWarn: true },
			{ version: '20.0.0', shouldWarn: true },
			{ version: '21.9.9', shouldWarn: true },
			{ version: '22.0.0', shouldWarn: false },
			{ version: '23.0.0', shouldWarn: false },
		];

		testCases.forEach(({ version, shouldWarn }) => {
			it(`${shouldWarn ? 'shows' : 'does not show'} warning for Node ${version}`, async () => {
				// Set Node version for this test
				Object.defineProperty(process, 'versions', {
					value: { ...originalVersions, node: version },
					configurable: true,
					writable: true,
				});

				const { lastFrame } = render(<Index />);
				await delay(100);
				const finalFrame = lastFrame()?.toString();

				if (shouldWarn) {
					expect(finalFrame).toContain(
						'Permit CLI is best supported from Node Version: 22',
					);
				} else {
					expect(finalFrame).not.toContain(
						'Permit CLI is best supported from Node22',
					);
				}
			});
		});
	});
});

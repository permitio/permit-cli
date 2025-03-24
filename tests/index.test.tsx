import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it } from 'vitest';
import Index from '../source/commands/index';
import delay from 'delay';
import * as keytar from 'keytar';
import { getMockFetchResponse } from './utils';


vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

describe('index file', () => {
	it('the index file should render', async() => {
		const { lastFrame } = render(<Index />);
		await delay(100);
		const finalFrame = lastFrame()?.toString();
		expect(finalFrame).toMatch(
			/Run this command with --help for more information/,
		);
		expect(finalFrame).toMatch(
			/You are not logged in./,
		);
	});
});

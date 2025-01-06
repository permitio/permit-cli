import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it } from 'vitest';
import Index from '../source/commands/index';
import delay from 'delay';

describe('index file', () => {
	it('the index file should render', () => {
		const { lastFrame } = render(<Index />);
		expect(lastFrame()?.toString()).toMatch(
			/Run this command with --help for more information/,
		);
	});
});

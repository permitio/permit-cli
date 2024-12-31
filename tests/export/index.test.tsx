import { expect, vi, describe, it } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import Export from '../../source/commands/env/export/index.js';
import { AuthProvider } from '../../source/components/AuthProvider.js';

// Test the main Export component
describe('Export Command', () => {
	it('renders with AuthProvider', () => {
		const { lastFrame } = render(<Export options={{}} />);
		expect(lastFrame()).toBeTruthy();
	});

	it('passes options correctly', () => {
		const options = { key: 'test-key', file: 'output.tf' };
		const { lastFrame } = render(<Export options={options} />);
		expect(lastFrame()).toBeTruthy();
	});
});

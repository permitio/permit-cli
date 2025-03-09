import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import Graph from '../source/commands/graph';

describe('graph command', () => {
	it('should render the Graph component inside AuthProvider', () => {
		const options = { apiKey: 'test-api-key' };
		const { lastFrame } = render(<Graph options={options} />);

		expect(lastFrame()).not.toBeNull();
	});
});

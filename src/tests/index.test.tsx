import React from 'react';
import { render } from 'ink-testing-library';
import Index from '../commands/index.js';

describe('Index Component', () => {
	it('should render the gradient text and help message', () => {
		const { lastFrame } = render(<Index />);
		expect(lastFrame()).toContain(
			'Run this command with --help for more information',
		);
	});
});

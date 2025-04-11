import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import ErrorView from '../../../source/components/test/views/ErrorView.js';

describe('ErrorView', () => {
	it('should render error message correctly', () => {
		const { lastFrame } = render(<ErrorView error="Test error message" />);
		expect(lastFrame()).toContain('Error: Test error message');
	});

	it('should handle error messages with special characters', () => {
		const { lastFrame } = render(
			<ErrorView error="Connection failed: couldn't reach server" />,
		);
		expect(lastFrame()).toContain(
			"Error: Connection failed: couldn't reach server",
		);
	});

	it('should handle long error messages', () => {
		const longError =
			'This is a very long error message that contains detailed information';
		const { lastFrame } = render(<ErrorView error={longError} />);
		// Check for the prefix and the beginning of the error message
		expect(lastFrame()).toContain('Error: ' + longError);
	});
});

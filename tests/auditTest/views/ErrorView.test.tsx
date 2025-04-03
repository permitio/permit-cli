import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import ErrorView from '../../../source/components/test/views/ErrorView.js';

describe('ErrorView', () => {
	it('should render error message', () => {
		const { lastFrame } = render(
			<ErrorView error="Test error message" pdpUrl="http://localhost:7766" />,
		);

		expect(lastFrame()).toContain('Error: Test error message');
		expect(lastFrame()).toContain('Troubleshooting tips:');
	});

	it('should include the PDP URL in the troubleshooting tips', () => {
		const pdpUrl = 'http://test-pdp:8080';
		const { lastFrame } = render(
			<ErrorView error="Connection failed" pdpUrl={pdpUrl} />,
		);

		expect(lastFrame()).toContain(pdpUrl);
	});

	it('should display all troubleshooting steps', () => {
		const { lastFrame } = render(
			<ErrorView error="API key invalid" pdpUrl="http://localhost:7766" />,
		);

		// Using more specific patterns that match the actual rendered text
		expect(lastFrame()).toContain('logged in with valid credentials');
		expect(lastFrame()).toContain('permit login');
		expect(lastFrame()).toContain('permission to access audit logs');
		expect(lastFrame()).toContain('Verify your PDP URL is correct');
		expect(lastFrame()).toContain('smaller time frame');
	});
});

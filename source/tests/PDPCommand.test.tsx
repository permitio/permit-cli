import React from 'react';
import { render } from 'ink-testing-library';
import PDPCommand from '../components/PDPCommand.js';
import { useAuth } from '../components/AuthProvider.js';
import { describe, it, expect, vi } from 'vitest';

// Mock the useAuth hook
vi.mock('../components/AuthProvider.js', async () => {
	const actual = await vi.importActual('../components/AuthProvider.js');
	return {
		...actual,
		useAuth: vi.fn(), 
	};
});

describe('PDPCommand', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it('should display the command when authToken is provided', () => {
		// Mock the useAuth hook to return a token
		(useAuth as vi.Mock).mockReturnValue({
			authToken: 'mocked-token',
		});

		const { lastFrame } = render(<PDPCommand opa={8080} />);

		// Ensure the command message is displayed
		expect(lastFrame()).toContain(
			'Run the following command from your terminal:',
		);
		expect(lastFrame()).toContain(
			'docker run -p 7766:7000 -p 8080:8181 --env PDP_API_KEY=mocked-token --env PDP_DEBUG=true permitio/pdp-v2:latest',
		);
	});

	it('should display loading spinner when authToken is not provided', () => {
		// Mock the useAuth hook to return no token
		(useAuth as vi.Mock).mockReturnValue({
			authToken: '',
		});

		const { lastFrame } = render(<PDPCommand />);
		console.log(lastFrame());

		// Assert that the loading spinner is displayed
		expect(lastFrame()).toContain('Loading command');
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import Policy from '../commands/opa/policy.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('keytar', () => ({
	loadAuthToken: vi.fn().mockResolvedValue('mock-api-key'),
}));

// Mock the global fetch function
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

describe('Policy Component', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it('should render without errors', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				result: [{ id: 'policy1' }, { id: 'policy2' }],
			}),
		});

		const { lastFrame } = render(
			<Policy
				options={{
					serverUrl: 'http://localhost:8181',
					keyAccount: 'test-key-account',
				}}
			/>,
		);

		// Wait for the policies to be fetched and rendered
		await waitFor(() => {
			expect(lastFrame()).toContain(
				'Listing Policies on Opa Server=http://localhost:8181',
			);
		});
	});

	it('should display a loading spinner initially', async () => {
		mockFetch.mockResolvedValueOnce(new Promise(() => {}));

		const { lastFrame } = render(
			<Policy
				options={{
					serverUrl: 'http://localhost:8181',
					keyAccount: 'test-key-account',
				}}
			/>,
		);

		// Check for spinner
		expect(lastFrame()).toContain('⠋');
	});

	it('should display policies when fetch is successful', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				result: [{ id: 'policy1' }, { id: 'policy2' }],
			}),
		});

		const { lastFrame } = render(
			<Policy
				options={{
					serverUrl: 'http://localhost:8181',
					keyAccount: 'test-key-account',
				}}
			/>,
		);

		// Wait for the policies to be rendered
		await waitFor(() => {
			const frame = lastFrame();
			console.log(frame);

			expect(lastFrame()).toContain(
				'Listing Policies on Opa Server=http://localhost:8181',
			);
			expect(lastFrame()).toContain('2');
		});
	});

	it('should display an error message when fetch fails', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: 'Some error occurred',
			}),
		});
		const { lastFrame } = render(
			<Policy
				options={{
					serverUrl: 'http://localhost:8181',
					keyAccount: 'test-key-account',
				}}
			/>,
		);

		// Wait for the error message to be displayed
		await waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain('Request failed:');
		});
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import { waitFor } from '@testing-library/react';
import Check from '../commands/pdp/check.js';
import { describe, it, expect, vi } from 'vitest';

vi.mock('keytar', () => ({
	getPassword: vi.fn().mockResolvedValue('mock-api-key'),
}));

describe('Check Component', () => {
	it('should display the checking indicator', async () => {
		const { lastFrame } = render(
			<Check
				options={{
					user: 'filip@permit.io',
					action: 'create',
					resource: 'task',
					apiKey: 'test-api-key',
					tenant: 'default',
					keyAccount: '',
				}}
			/>,
		);

		// Assert that the checking indicator is displayed in the terminal
		const res = lastFrame();
		expect(res).toContain(
			'Checking user="filip@permit.io" action=create resource=task at tenant=default',
		);
	});

	it('should display ALLOWED when access is granted', async () => {
		// Mock fetch to return a successful response indicating allowed access
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ allow: true }),
		});

		const { lastFrame } = render(
			<Check
				options={{
					user: 'filip@permit.io',
					action: 'create',
					resource: 'task',
					apiKey: 'test-api-key',
					tenant: 'default',
					keyAccount: '',
				}}
			/>,
		);

		await waitFor(() => {
			expect(lastFrame()).toContain('ALLOWED');
		});
	});

	it('should display DENIED when access is not granted', async () => {
		// Mock fetch to return a successful response indicating denied access
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ allow: false }),
		});

		const { lastFrame } = render(
			<Check
				options={{
					user: 'filip@permit.io',
					action: 'create',
					resource: 'task',
					apiKey: 'test-api-key',
					tenant: 'default',
					keyAccount: '',
				}}
			/>,
		);

		await waitFor(() => {
			expect(lastFrame()).toContain('DENIED');
		});
	});
	it('should handle error when the API call fails', async () => {
		// Mock fetch to simulate a failed response
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			text: vi.fn().mockResolvedValue('Some error occurred'),
		});

		const { lastFrame } = render(
			<Check
				options={{
					user: 'filip@permit.io',
					action: 'create',
					resource: 'task',
					apiKey: 'test-api-key',
					tenant: 'default',
					keyAccount: '',
				}}
			/>,
		);

		await waitFor(() => {
			expect(lastFrame()).toContain('Request failed: "Some error occurred"');
		});
	});
});

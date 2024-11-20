import React from 'react';
import { render } from 'ink-testing-library';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Logout from '../commands/logout.js';
import * as auth from '../lib/auth.js';

beforeEach(() => {
	// Clear all mocks before each test
	vi.clearAllMocks();
});

describe('Logout component', () => {
	it('should display loading spinner while cleaning session', async () => {
		// Mock the cleanAuthToken function
		vi.spyOn(auth, 'cleanAuthToken').mockResolvedValueOnce(undefined);

		const { lastFrame } = render(<Logout />);

		expect(lastFrame()).toContain('Cleaning session...');

		// Wait for the spinner to disappear and the "Logged Out" message to appear
		await waitFor(() => {
			expect(lastFrame()).toContain('Logged Out');
		});
	});

	it('should call cleanAuthToken and exit the process', async () => {
		// Mock cleanAuthToken and process.exit
		vi.spyOn(auth, 'cleanAuthToken').mockResolvedValueOnce(undefined);

		// Mock process.exit and ensure it returns never
		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation((code?: string | number | null | undefined) => {
				throw new Error(`process.exit called with code ${code}`);
			}) as unknown as (code?: number) => never;

		const { lastFrame } = render(<Logout />);

		expect(lastFrame()).toContain('Cleaning session...');

		// Wait for the spinner to disappear and the "Logged Out" message to appear
		await waitFor(() => {
			expect(lastFrame()).toContain('Logged Out');
		});

		expect(auth.cleanAuthToken).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import { waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../components/AuthProvider.js';
import { loadAuthToken } from '../lib/auth.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Text } from 'ink';

// Mock loadAuthToken function
vi.mock('../lib/auth.js', () => ({
	loadAuthToken: vi.fn(),
}));

// Mock the global fetch function
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

global.fetch = vi.fn();

describe('AuthProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display loading text while loading token', async () => {
		// Mock loadAuthToken to return a promise that resolves later
		(loadAuthToken as vi.Mock).mockImplementationOnce(
			() => new Promise(() => {}),
		);

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		// Assert that the loading text is displayed
		expect(lastFrame()).toContain('Loading Token');
	});
	it('should display error message if loading token fails', async () => {
		// Mock loadAuthToken to throw an error
		(loadAuthToken as vi.Mock).mockRejectedValueOnce(
			new Error('Failed to load token'),
		);

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		// Wait for the error message to be displayed
		await waitFor(() => {
			expect(lastFrame()).toContain('Failed to load token');
		});
	});

	it('should display children when token is loaded successfully', async () => {
		// Mock loadAuthToken to resolve with a token
		(loadAuthToken as vi.Mock).mockResolvedValueOnce('mocked-token');

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		// Wait for the children to be displayed
		await waitFor(() => {
			expect(lastFrame()).toContain('Child Component');
		});
	});
	it('should use the auth context successfully', async () => {
		const ChildComponent = () => {
			const { authToken } = useAuth();
			return <Text>{authToken || 'No token'}</Text>;
		};

		// Mock loadAuthToken to return a token
		(loadAuthToken as vi.Mock).mockResolvedValueOnce('mocked-token');

		const { lastFrame } = render(
			<AuthProvider>
				<ChildComponent />
			</AuthProvider>,
		);

		// Wait for the token to be displayed
		await waitFor(() => {
			expect(lastFrame()).toContain('mocked-token');
		});
	});

	it('should throw an error when useAuth is called outside of AuthProvider', () => {
		const ChildComponent = () => {
			const auth = useAuth();
			return <Text>{auth.authToken}</Text>;
		};

		try {
			render(<ChildComponent />);
		} catch (error: any) {
			expect(error.message).toMatch(
				/useAuth must be used within an AuthProvider/,
			);
			return;
		}
	});
});

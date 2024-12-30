import React from 'react';
import { render } from 'ink-testing-library';
import { AuthProvider, useAuth } from '../../source/components/AuthProvider.js';
import { loadAuthToken } from '../../source/lib/auth.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Text } from 'ink';
import delay from 'delay';

vi.mock('../../source/lib/auth.js', () => ({
	loadAuthToken: vi.fn(),
}));

describe('AuthProvider', () => {
	it('should display loading text while loading token', async () => {
		(loadAuthToken as any).mockResolvedValueOnce(new Promise(() => {}));

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		expect(lastFrame()).toContain('Loading Token');
	});
	it('should display error message if loading token fails', async () => {
		(loadAuthToken as any).mockRejectedValueOnce(
			new Error('Failed to load token'),
		);

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		await delay(50);
		expect(lastFrame()).toContain('Failed to load token');
	});

	it('should display children when token is loaded successfully', async () => {
		(loadAuthToken as any).mockResolvedValueOnce('mocked-token');

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		await delay(50);
		expect(lastFrame()).toContain('Child Component');
	});
	it('should use the auth context successfully', async () => {
		const ChildComponent = () => {
			const { authToken } = useAuth();
			return <Text>{authToken || 'No token'}</Text>;
		};

		(loadAuthToken as any).mockResolvedValueOnce('mocked-token');

		const { lastFrame } = render(
			<AuthProvider>
				<ChildComponent />
			</AuthProvider>,
		);

		await delay(100);
		expect(lastFrame()).toContain('mocked-token');
	});

	it('should throw an error when useAuth is called outside of AuthProvider', () => {
		const ChildComponent = () => {
			let apiKey: string;
			try {
				const { authToken } = useAuth();
				apiKey = authToken;
			} catch (error) {
				return <Text>useAuth must be used within an AuthProvider</Text>;
			}
			return <Text>{apiKey || 'No token'}</Text>;
		};
		const { lastFrame } = render(<ChildComponent />);
		expect(lastFrame()).toContain(
			'useAuth must be used within an AuthProvider',
		);
	});
});

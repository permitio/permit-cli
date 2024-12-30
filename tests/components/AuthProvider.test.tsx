import React from 'react';
import { render } from 'ink-testing-library';
import { AuthProvider, useAuth } from '../../source/components/AuthProvider.js';
import { loadAuthToken } from '../../source/lib/auth.js';
import { describe, it, expect, vi } from 'vitest';
import { Text } from 'ink';
import delay from 'delay';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('../../source/lib/auth.js', async () => {
	const original = await vi.importActual('../../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(),
	};
});

vi.mock('keytar', async() => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	// const original = await vi.importActual('keytar');
	return {
		// ...original,
		setPassword: vi.fn().mockResolvedValue(demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	}
});

vi.mock('../../source/hooks/useApiKeyApi', async() => {
	const original = await vi.importActual('../../source/hooks/useApiKeyApi');
	return {
		...original,
		useApiKeyApi: () => ({
			getApiKeyScope: vi.fn().mockResolvedValue({
				response: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
				status: 200,
			}),
			getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
				response: { secret: 'test-secret' },
				error: null,
			}),
			validateApiKeyScope: vi.fn().mockResolvedValue({
				valid: true,
				scope: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null
			})
		}),
	}
});



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
	it('Redirect to Login if loading token fails', async () => {
		(loadAuthToken as any).mockRejectedValue(
			new Error('Failed to load token'),
		);

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		await delay(50);
		expect(lastFrame()).toContain('Login to Permit');
	});

	it('should display children when token is loaded successfully', async () => {
		(loadAuthToken as any).mockResolvedValue(demoPermitKey);

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		await delay(500);
		expect(lastFrame()).toContain('Child Component');
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

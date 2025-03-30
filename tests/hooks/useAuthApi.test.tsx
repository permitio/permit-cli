import { useAuthApi } from '../../source/hooks/useAuthApi.js';
import { apiCall } from '../../source/lib/api.js';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// Mocking the apiCall function
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

describe('useAuthApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should switch organization and return success', async () => {
		const TestComponent = () => {
			const { authSwitchOrgs } = useAuthApi();
			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue({ success: true });
			const [result, setResult] = React.useState<string | null>(null);

			const switchOrg = async () => {
				const result = await authSwitchOrgs(
					'workspace-id',
					'access-token',
					'cookie',
				);
				return result.success
					? 'OrganizationReadWithAPIKey switched'
					: 'Failed to switch';
			};
			switchOrg().then(res => setResult(res));
			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('OrganizationReadWithAPIKey switched');
		});
	});

	it('should login and return success', async () => {
		const TestComponent = () => {
			const { getLogin } = useAuthApi();
			// Mock the apiCall to simulate a successful login response
			apiCall.mockResolvedValue({ success: true });
			const [result, setResult] = React.useState<string | null>(null);

			const login = async () => {
				const result = await getLogin('valid-token');
				return result.success ? 'Login successful' : 'Login failed';
			};
			login().then(res => setResult(res));
			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Login successful');
		});
	});

	it('should handle failed organization switch', async () => {
		const TestComponent = () => {
			const { authSwitchOrgs } = useAuthApi();
			// Mock the apiCall to simulate a failed response
			apiCall.mockResolvedValue({ success: false });
			const [result, setResult] = React.useState<string | null>(null);

			const switchOrg = async () => {
				const result = await authSwitchOrgs(
					'workspace-id',
					'access-token',
					'cookie',
				);
				return result.success
					? 'OrganizationReadWithAPIKey switched'
					: 'Failed to switch';
			};
			switchOrg().then(res => setResult(res));
			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to switch');
		});
	});

	it('should handle failed login', async () => {
		const TestComponent = () => {
			const { getLogin } = useAuthApi();
			// Mock the apiCall to simulate a failed login response
			apiCall.mockResolvedValue({ success: false });

			const login = async () => {
				const result = await getLogin('invalid-token');
				return result.success ? 'Login successful' : 'Login failed';
			};
			const [result, setResult] = React.useState<string | null>(null);
			login().then(res => setResult(res));
			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Login failed');
		});
	});
});

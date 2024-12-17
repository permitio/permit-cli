import { useEnvironmentApi } from '../../source/hooks/useEnvironmentApi';
import { apiCall } from '../../source/lib/api';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// Mocking the apiCall function
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

describe('useEnvironmentApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch environments and return a list of environments', async () => {
		const TestComponent = () => {
			const { getEnvironments } = useEnvironmentApi();
			const projectId = 'project-id';
			const accessToken = 'access-token';

			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue([
				{
					key: 'env-key-1',
					id: 'env-id-1',
					organization_id: 'org-id',
					project_id: 'project-id',
					created_at: '2024-12-01',
					updated_at: '2024-12-02',
					email_configuration: 'email-config',
					name: 'Env 1',
				},
			]);

			const fetchEnvironments = async () => {
				const environments = await getEnvironments(projectId, accessToken);
				return environments.length > 0
					? 'Environments fetched'
					: 'No environments';
			};
			const [restult, setResult] = React.useState<string | null>(null);
			fetchEnvironments().then(res => setResult(res));
			return <Text>{restult}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Environments fetched');
		});
	});

	it('should fetch a single environment by id', async () => {
		const TestComponent = () => {
			const { getEnvironment } = useEnvironmentApi();
			const projectId = 'project-id';
			const environmentId = 'env-id-1';
			const accessToken = 'access-token';

			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue({
				key: 'env-key-1',
				id: 'env-id-1',
				organization_id: 'org-id',
				project_id: 'project-id',
				created_at: '2024-12-01',
				updated_at: '2024-12-02',
				email_configuration: 'email-config',
				name: 'Env 1',
			});

			const fetchEnvironment = async () => {
				const environment = await getEnvironment(
					projectId,
					environmentId,
					accessToken,
				);
				return environment ? 'Environment fetched' : 'No environment found';
			};
			const [restult, setResult] = React.useState<string | null>(null);
			fetchEnvironment().then(res => setResult(res));

			return <Text>{restult}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Environment fetched');
		});
	});

	it('should handle failed fetch of environments', async () => {
		const TestComponent = () => {
			const { getEnvironments } = useEnvironmentApi();
			const projectId = 'project-id';
			const accessToken = 'access-token';

			// Mock the apiCall to simulate a failed response
			apiCall.mockResolvedValue([]);

			const fetchEnvironments = async () => {
				const environments = await getEnvironments(projectId, accessToken);
				return environments.length > 0
					? 'Environments fetched'
					: 'No environments';
			};
			const [restult, setResult] = React.useState<string | null>(null);
			fetchEnvironments().then(res => setResult(res));

			return <Text>{restult}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('No environments');
		});
	});

	it('should copy an environment successfully', async () => {
		const TestComponent = () => {
			const { copyEnvironment } = useEnvironmentApi();
			const projectId = 'project-id';
			const environmentId = 'env-id-1';
			const accessToken = 'access-token';
			const cookie = 'cookie';
			const body = { someKey: 'someValue' };

			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue({ success: true });

			const copyEnv = async () => {
				const result = await copyEnvironment(
					projectId,
					environmentId,
					accessToken,
					cookie,
					body,
				);
				return result.success
					? 'Environment copied'
					: 'Failed to copy environment';
			};
			const [result, setResult] = React.useState<string | null>(null);
			copyEnv().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Environment copied');
		});
	});

	it('should handle failed environment copy', async () => {
		const TestComponent = () => {
			const { copyEnvironment } = useEnvironmentApi();
			const projectId = 'project-id';
			const environmentId = 'env-id-1';
			const accessToken = 'access-token';
			const cookie = 'cookie';
			const body = { someKey: 'someValue' };

			// Mock the apiCall to simulate a failed response
			apiCall.mockResolvedValue({ success: false });

			const copyEnv = async () => {
				const result = await copyEnvironment(
					projectId,
					environmentId,
					accessToken,
					cookie,
					body,
				);
				return result.success
					? 'Environment copied'
					: 'Failed to copy environment';
			};

			const [result, setResult] = React.useState<string | null>(null);
			copyEnv().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to copy environment');
		});
	});
});

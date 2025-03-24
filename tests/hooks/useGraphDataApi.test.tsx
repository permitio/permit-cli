import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useGraphDataApi from '../../source/hooks/useGraphDataApi';
import useClient from '../../source/hooks/useClient';

// Mock useClient to return a fake client for API calls.
vi.mock('../../source/hooks/useClient', () => ({
	default: vi.fn(),
}));

describe('useGraphDataApi hook', () => {
	let fakeClient: { GET: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.clearAllMocks();
		fakeClient = {
			GET: vi.fn(),
		};

		(useClient as any).mockReturnValue({
			authenticatedApiClient: () => fakeClient,
		});
	});

	it('should return graph data successfully', async () => {
		// Setup fake responses for the two GET calls.
		fakeClient.GET.mockResolvedValueOnce({
			data: [
				{
					resource: 'Resource',
					resource_id: 'r1',
					id: 'r1',
					key: 'k1',
					relationships: [{ subject: 'r1', relation: 'owns', object: 'r2' }],
				},
				{
					resource: 'Resource',
					resource_id: 'r2',
					id: 'r2',
					key: 'k2',
					relationships: [],
				},
			],
			error: null,
		}).mockResolvedValueOnce({
			data: [
				{
					key: 'user1',
					email: 'user1@example.com',
					associated_tenants: [
						{
							tenant: 'default',
							roles: [],
							status: 'active',
							resource_instance_roles: [
								{
									resource_instance: 'r1',
									resource: 'Resource',
									role: 'admin',
								},
							],
						},
					],
				},
			],
			error: null,
		});

		const TestComponent = () => {
			const { fetchGraphData } = useGraphDataApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				fetchGraphData('proj1', 'env1').then(res => {
					if (res.error) {
						setResult(res.error);
					} else {
						setResult('Graph data loaded');
					}
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Graph data loaded');
		});
	});

	it('should handle error in resource instances fetch', async () => {
		fakeClient.GET.mockResolvedValueOnce({
			data: null,
			error: 'Failed to fetch data. Check network or auth token.',
		});
		fakeClient.GET.mockResolvedValueOnce({
			data: null,
			error: null,
		});

		const TestComponent = () => {
			const { fetchGraphData } = useGraphDataApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				fetchGraphData('proj1', 'env1').then(res => {
					if (res.error) {
						setResult(res.error);
					} else {
						setResult('Graph data loaded');
					}
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'Failed to fetch data. Check network or auth token.',
			);
		});
	});

	it('should handle error in user roles fetch', async () => {
		fakeClient.GET.mockResolvedValueOnce({
			data: [
				{
					resource: 'Resource',
					resource_id: 'r1',
					id: 'r1',
					key: 'k1',
					relationships: [],
				},
			],
			error: null,
		});
		fakeClient.GET.mockResolvedValueOnce({
			data: null,
			error: 'Failed to fetch data. Check network or auth token.',
		});

		const TestComponent = () => {
			const { fetchGraphData } = useGraphDataApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				fetchGraphData('proj1', 'env1').then(res => {
					if (res.error) {
						setResult(res.error);
					} else {
						setResult('Graph data loaded');
					}
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe(
				'Failed to fetch data. Check network or auth token.',
			);
		});
	});

	it('should handle empty graph data', async () => {
		fakeClient.GET.mockResolvedValueOnce({
			data: [],
			error: null,
		}).mockResolvedValueOnce({
			data: [],
			error: null,
		});

		const TestComponent = () => {
			const { fetchGraphData } = useGraphDataApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				fetchGraphData('proj1', 'env1').then(res => {
					if (res.error) {
						setResult(res.error);
					} else {
						if (
							res.data &&
							res.data.nodes.length === 0 &&
							res.data.edges.length === 0
						) {
							setResult('No graph data');
						} else {
							setResult('Graph data loaded');
						}
					}
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('No graph data');
		});
	});
});

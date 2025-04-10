import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';
import { useResourcesApi } from '../../source/hooks/useResourcesApi.js';

global.fetch = vi.fn();

describe('useResourcesApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should get resources', async () => {
		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ([
					{ id: 'res-1', name: 'Database' },
					{ id: 'res-2', name: 'Cache' },
				]),
		});

		const TestComponent = () => {
			const { getResources } = useResourcesApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const get = async () => {
					const { data } = await getResources();
					setResult(data.map((r: any) => r.name).join(', '));
				};
				get();
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Database, Cache');
		});
	});
});

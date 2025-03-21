import { useProjectAPI } from '../../source/hooks/useProjectAPI.js';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';

global.fetch = vi.fn();

describe('useProjectAPI', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch all projects', async () => {
		const TestComponent = () => {
			const { getProjects } = useProjectAPI();

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => ([{
					key: 'project-key',
					id: 'project-id',
					organization_id: 'org-id',
					created_at: '2024-01-01',
					updated_at: '2024-01-02',
					name: 'Project Name',
					settings: {},
					active_policy_repo_id: 'policy-id',
				}])
			});

			const fetchProjects = async () => {
				const { data: projects } = await getProjects();
				return (projects?.length ?? 0 > 0) && projects ? projects[0]?.name : 'No projects';
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchProjects().then(res => setResult(res ?? null));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Project Name');
		});
	});

	it('should handle failure to fetch projects', async () => {
		const TestComponent = () => {
			const { getProjects } = useProjectAPI();
			const accessToken = 'access-token';
			const cookie = 'cookie';

			(fetch as any).mockRejectedValueOnce(new Error('Failed to fetch projects'));

			const fetchProjects = async () => {
				try {
					const { data: projects } = await getProjects();
					return (projects?.length ?? 0 > 0) && projects ? projects[0]?.name : 'No projects';
				} catch (error) {
					return error.message;
				}
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchProjects().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to fetch projects');
		});
	});
});

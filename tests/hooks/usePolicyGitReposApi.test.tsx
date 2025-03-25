import {
	GitConfig,
	usePolicyGitReposApi,
} from '../../source/hooks/usePolicyGitReposApi.js';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';

global.fetch = vi.fn();

describe('usePolicyGitReposApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch all repos', async () => {
		const TestComponent = () => {
			const { getRepoList } = usePolicyGitReposApi();

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => [
					{ status: 'active', key: 'repo1' },
					{ status: 'active', key: 'repo2' },
				],
			});

			const fetchRepoList = async () => {
				const { data: repos } = await getRepoList('project_id');
				return repos;
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchRepoList().then(res =>
				setResult(res ? (res[0]?.key ?? null) : null),
			);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('repo1');
		});
	});

	it('should handle failure to fetch projects', async () => {
		const TestComponent = () => {
			const { configurePermit } = usePolicyGitReposApi();

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => ({
					status: 'valid',
				}),
			});

			const doConfigurePermit = async () => {
				const { data } = await configurePermit('', {
					url: 'string',
					mainBranchName: 'string',
					credentials: {
						authType: 'ssh',
						username: 'string',
						privateKey: 'string',
					},
					key: 'string',
					activateWhenValidated: true,
				} as GitConfig);
				return data;
			};
			const [result, setResult] = React.useState<string | null>(null);
			doConfigurePermit().then(res => setResult(res?.status ?? null));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('valid');
		});
	});
});

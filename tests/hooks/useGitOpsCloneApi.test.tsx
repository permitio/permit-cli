import React, { useEffect, useState } from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useGitOpsCloneApi from '../../source/hooks/useGitopsCloneApi.js';
import useClient from '../../source/hooks/useClient.js';
import { Box, Text } from 'ink';

// Mock useClient hook
vi.mock('../../source/hooks/useClient.js', () => ({
	default: vi.fn(),
}));

// Test component to use the hook
const TestComponent = ({
	projectId,
	apiKey,
}: {
	projectId: string;
	apiKey?: string;
}) => {
	const { fetchActivePolicyRepo } = useGitOpsCloneApi();
	const [repo, setRepo] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchRepo = async () => {
			try {
				const result = await fetchActivePolicyRepo(projectId, apiKey);
				setRepo(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		};
		fetchRepo();
	}, [projectId, apiKey, fetchActivePolicyRepo]);

	return (
		<Box flexDirection="column">
			{error && <Text>Error: {error}</Text>}
			{repo && <Text>Repository: {repo}</Text>}
			{repo === null && !error && <Text>No repository found</Text>}
		</Box>
	);
};

describe('useGitOpsCloneApi', () => {
	const mockAuthenticatedClient = {
		GET: vi.fn(),
	};

	const mockUnAuthenticatedClient = {
		GET: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		(useClient as any).mockReturnValue({
			authenticatedApiClient: () => mockAuthenticatedClient,
			unAuthenticatedApiClient: () => mockUnAuthenticatedClient,
		});
	});

	it('fetches repository using authenticated client when no API key is provided', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'https://github.com/example/repo.git' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockAuthenticatedClient.GET).toHaveBeenCalledWith(
			'/v2/projects/{proj_id}/repos/active',
			{ proj_id: 'test-project' },
		);
		expect(lastFrame()).toContain(
			'Repository: https://github.com/example/repo.git',
		);
	});

	it('fetches repository using unauthenticated client when API key is provided', async () => {
		mockUnAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'https://github.com/example/repo.git' },
			error: null,
		});

		const { lastFrame } = render(
			<TestComponent projectId="test-project" apiKey="test-api-key" />,
		);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(mockUnAuthenticatedClient.GET).toHaveBeenCalledWith(
			'/v2/projects/{proj_id}/repos/active',
			{ proj_id: 'test-project' },
		);
		expect(lastFrame()).toContain(
			'Repository: https://github.com/example/repo.git',
		);
	});

	it('converts SSH URL to HTTPS URL', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'git@github.com:example/repo.git' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain(
			'Repository: https://github.com/example/repo',
		);
	});

	it('handles API error', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: null,
			error: 'API Error',
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain(
			'Error: Failed to fetch Active policy Repository: API Error',
		);
	});

	it('returns null when no repository data is available', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: null,
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('No repository found');
	});

	it('handles invalid SSH URL format', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'git@' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Error: Invalid SSH URL format');
	});

	it('handles SSH URL without proper separator', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'git@github.com/repo.git' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Error: Invalid SSH URL format');
	});

	it('handles non-SSH URL correctly', async () => {
		mockAuthenticatedClient.GET.mockResolvedValue({
			data: { url: 'not-a-git-url' },
			error: null,
		});

		const { lastFrame } = render(<TestComponent projectId="test-project" />);

		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Repository: not-a-git-url');
	});
});

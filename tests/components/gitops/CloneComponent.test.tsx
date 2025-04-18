import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CloneComponent from '../../../source/components/gitops/CloneComponent';
import { useAuth } from '../../../source/components/AuthProvider';
import useGitOpsCloneApi from '../../../source/hooks/useGitopsCloneApi';
import { useEnvironmentApi } from '../../../source/hooks/useEnvironmentApi';
import useExecCommand from '../../../source/hooks/useExecCommand';
import { Text } from 'ink';

// Create a mock select handler that we can control
let mockSelectHandler: ((value: { value: string }) => void) | null = null;

// Mock all dependencies
vi.mock('ink-spinner', () => ({
	default: () => <Text>Spinner</Text>,
}));

vi.mock('ink-select-input', () => ({
	default: ({ items, onSelect }) => {
		mockSelectHandler = onSelect;
		return <Text>Select: {items.map((i: any) => i.label).join(', ')}</Text>;
	},
}));

vi.mock('../../../source/components/AuthProvider', () => ({
	useAuth: vi.fn(),
}));

vi.mock('../../../source/hooks/useGitopsCloneApi', () => ({
	default: vi.fn(),
}));

vi.mock('../../../source/hooks/useEnvironmentApi', () => ({
	useEnvironmentApi: vi.fn(),
}));

vi.mock('../../../source/hooks/useExecCommand', () => ({
	default: vi.fn(),
}));

// Mock process.exit
const exitMock = vi
	.spyOn(process, 'exit')
	.mockImplementation((code?: number) => {
		return undefined as never;
	});

describe('CloneComponent', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockSelectHandler = null;

		// Default mock implementations
		(useAuth as any).mockReturnValue({
			scope: { project_id: 'test-project-id' },
		});

		(useGitOpsCloneApi as any).mockReturnValue({
			fetchActivePolicyRepo: vi
				.fn()
				.mockResolvedValue('https://github.com/test/repo.git'),
		});

		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi.fn().mockResolvedValue({
				data: [
					{ id: 'env1', name: 'Test Env 1', key: 'test1' },
					{ id: 'env2', name: 'Test Env 2', key: 'test2' },
				],
				error: null,
			}),
		});

		(useExecCommand as any).mockReturnValue({
			exec: vi
				.fn()
				.mockResolvedValue({ stdout: 'Clone successful', stderr: '' }),
			error: null,
		});
	});

	it('shows loading state initially', () => {
		const { lastFrame } = render(<CloneComponent />);
		expect(lastFrame()).toContain(
			'SpinnerChecking for active Git repository....',
		);
	});

	it('shows no repository message when no repo found', async () => {
		(useGitOpsCloneApi as any).mockReturnValue({
			fetchActivePolicyRepo: vi.fn().mockResolvedValue(null),
		});

		const { lastFrame } = render(<CloneComponent />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain(
			'No active Git repository found for the project. Run `permit gitops create github` to setup GitOps on',
		);
		expect(lastFrame()).toContain(' your project.');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('handles API error', async () => {
		(useGitOpsCloneApi as any).mockReturnValue({
			fetchActivePolicyRepo: vi.fn().mockRejectedValue(new Error('API Error')),
		});

		const { lastFrame } = render(<CloneComponent />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('API Error');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('shows environment selection in normal mode', async () => {
		const { lastFrame } = render(<CloneComponent />);

		// Wait for initial render and API calls
		await new Promise(resolve => setTimeout(resolve, 50));

		// Check that we're showing the selection UI
		expect(lastFrame()).toContain('Select:');
		expect(lastFrame()).toContain('Test Env 1');
		expect(lastFrame()).toContain('Test Env 2');
	});

	it('handles environment selection and clones successfully', async () => {
		const { lastFrame } = render(<CloneComponent />);

		// Wait for initial render and API calls
		await new Promise(resolve => setTimeout(resolve, 50));

		// Verify we're in selection state
		expect(lastFrame()).toContain('Select:');

		// Manually trigger selection
		expect(mockSelectHandler).toBeTruthy();
		mockSelectHandler!({ value: 'env1' });

		// Wait for clone operation
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('SucessFully cloned the repository');
		expect(exitMock).toHaveBeenCalledWith(0);
	});

	it('handles clone error', async () => {
		(useExecCommand as any).mockReturnValue({
			exec: vi.fn().mockRejectedValue(new Error('Clone failed')),
			error: 'Clone failed',
		});

		const { lastFrame } = render(<CloneComponent />);

		// Wait for initial render
		await new Promise(resolve => setTimeout(resolve, 50));

		// Trigger selection to start clone
		expect(mockSelectHandler).toBeTruthy();
		mockSelectHandler!({ value: 'env1' });

		// Wait for error state
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Clone failed');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('handles project mode with dryRun', async () => {
		const { lastFrame } = render(<CloneComponent project dryRun />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('Command to execute');
		expect(lastFrame()).toContain('git clone https://github.com/test/repo.git');
		expect(exitMock).toHaveBeenCalledWith(0);
	});

	it('handles project mode without dryRun', async () => {
		const { lastFrame } = render(<CloneComponent project />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('SucessFully cloned the repository');
		expect(exitMock).toHaveBeenCalledWith(0);
	});

	it('handles environment fetch error', async () => {
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi.fn().mockResolvedValue({
				data: null,
				error: 'Failed to fetch environments',
			}),
		});

		const { lastFrame } = render(<CloneComponent />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('Failed To fetch Environments');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('handles empty environments list', async () => {
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		});

		const { lastFrame } = render(<CloneComponent />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('No Environments found in this project');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('uses provided apiKey', async () => {
		const fetchActivePolicyRepo = vi
			.fn()
			.mockResolvedValue('https://github.com/test/repo.git');
		(useGitOpsCloneApi as any).mockReturnValue({ fetchActivePolicyRepo });

		render(<CloneComponent apiKey="test-api-key" />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(fetchActivePolicyRepo).toHaveBeenCalledWith();
	});

	it('shows cloning state during clone operation', async () => {
		let resolveExec: Function;
		(useExecCommand as any).mockReturnValue({
			exec: vi.fn(
				() =>
					new Promise(resolve => {
						resolveExec = resolve;
					}),
			),
			error: null,
		});

		const { lastFrame } = render(<CloneComponent />);

		// Wait for initial render
		await new Promise(resolve => setTimeout(resolve, 50));

		// Trigger selection
		expect(mockSelectHandler).toBeTruthy();
		mockSelectHandler!({ value: 'env1' });

		// Should show cloning state
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('Cloning the Environment');

		// Complete the clone operation
		resolveExec!({ stdout: 'Clone successful', stderr: '' });
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('SucessFully cloned the repository');
		expect(exitMock).toHaveBeenCalledWith(0);
	});

	it('handles project mode clone error', async () => {
		(useExecCommand as any).mockReturnValue({
			exec: vi.fn().mockRejectedValue(new Error('Project clone failed')),
			error: 'Project clone failed',
		});

		const { lastFrame } = render(<CloneComponent project />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('Project clone failed');
		expect(exitMock).toHaveBeenCalledWith(1);
	});

	it('handles non-Error objects in catch blocks', async () => {
		(useGitOpsCloneApi as any).mockReturnValue({
			fetchActivePolicyRepo: vi.fn().mockRejectedValue('String error'),
		});

		const { lastFrame } = render(<CloneComponent />);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(lastFrame()).toContain('String error');
		expect(exitMock).toHaveBeenCalledWith(1);
	});
});

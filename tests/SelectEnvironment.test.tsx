import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import SelectEnvironment from '../source/components/SelectEnvironment.js';
import { useEnvironmentApi } from '../source/hooks/useEnvironmentApi.js';
import delay from 'delay';
import * as keytar from 'keytar';

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

vi.mock('../source/hooks/useEnvironmentApi.js', () => ({
	useEnvironmentApi: vi.fn(),
}));

const enter = '\r';
const arrowDown = '\u001B[B';

describe('SelectEnvironment Component', () => {
	it('should display loading state initially', () => {
		const mockGetEnvironments = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'env1', name: 'Environment 1' },
					{ id: 'env2', name: 'Environment 2' },
				],
				error: null,
			}),
		);
		(useEnvironmentApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getEnvironments: mockGetEnvironments,
		});

		const activeProject = { label: 'Project 1', value: 'proj1' };

		const { lastFrame } = render(
			<SelectEnvironment
				accessToken="test_token"
				cookie="test_cookie"
				activeProject={activeProject}
				onComplete={vi.fn()}
				onError={vi.fn()}
			/>,
		);

		expect(lastFrame()).toMatch(/Loading Environments.../);
	});

	it('should display environments after loading', async () => {
		const mockGetEnvironments = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'env1', name: 'Environment 1' },
					{ id: 'env2', name: 'Environment 2' },
				],
				error: null,
			}),
		);
		(useEnvironmentApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getEnvironments: mockGetEnvironments,
		});

		const onComplete = vi.fn();
		const activeProject = { label: 'Project 1', value: 'proj1' };

		const { stdin, lastFrame } = render(
			<SelectEnvironment
				accessToken="test_token"
				cookie="test_cookie"
				activeProject={activeProject}
				onComplete={onComplete}
				onError={vi.fn()}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Select an environment/);
		expect(lastFrame()).toMatch(/Environment 1/);
		expect(lastFrame()).toMatch(/Environment 2/);

		// Simulate user input to select the second environment
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onComplete).toHaveBeenCalledOnce();
		expect(onComplete).toHaveBeenCalledWith({
			label: 'Environment 2',
			value: 'env2',
		});
	});

	it('should handle errors when fetching environments fails', async () => {
		const mockGetEnvironments = vi.fn(() =>
			Promise.resolve({
				data: undefined,
				error: 'Network error',
			}),
		);
		(useEnvironmentApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getEnvironments: mockGetEnvironments,
		});

		const onError = vi.fn();
		const activeProject = { label: 'Project 1', value: 'proj1' };

		render(
			<SelectEnvironment
				accessToken="test_token"
				cookie="test_cookie"
				activeProject={activeProject}
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(
			'Failed to load environments for project "Project 1". Reason: Network error. Please check your network connection or credentials and try again.',
		);
	});

	it('should handle empty environment list gracefully', async () => {
		const mockGetEnvironments = vi.fn(() =>
			Promise.resolve({
				data: [],
				error: null,
			}),
		);
		(useEnvironmentApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getEnvironments: mockGetEnvironments,
		});

		const onError = vi.fn();
		const activeProject = { label: 'Project 1', value: 'proj1' };

		const { lastFrame } = render(
			<SelectEnvironment
				accessToken="test_token"
				cookie="test_cookie"
				activeProject={activeProject}
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Select an environment/);
		expect(lastFrame()).not.toMatch(/Environment 1/);
		expect(lastFrame()).not.toMatch(/Environment 2/);
		expect(onError).not.toHaveBeenCalled();
	});
});

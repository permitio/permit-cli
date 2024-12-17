import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import SelectProject from '../source/components/SelectProject.js';
import { useProjectAPI } from '../source/hooks/useProjectAPI.js';
import delay from 'delay';

vi.mock('../source/hooks/useProjectAPI.js', () => ({
	useProjectAPI: vi.fn(),
}));

const enter = '\r';
const arrowDown = '\u001B[B';

describe('SelectProject Component', () => {
	it('should display loading state initially', () => {
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				response: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});

		const { lastFrame } = render(
			<SelectProject
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={vi.fn()}
				onError={vi.fn()}
			/>,
		);

		expect(lastFrame()).toMatch(/Loading Projects.../);
	});

	it('should display projects after loading', async () => {
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				response: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});

		const onComplete = vi.fn();
		const { stdin, lastFrame } = render(
			<SelectProject
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={onComplete}
				onError={vi.fn()}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Select a project/);
		expect(lastFrame()).toMatch(/Project 1/);
		expect(lastFrame()).toMatch(/Project 2/);

		// Simulate user input to select the second project
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onComplete).toHaveBeenCalledOnce();
		expect(onComplete).toHaveBeenCalledWith({
			label: 'Project 2',
			value: 'proj2',
		});
	});

	it('should handle errors when fetching projects fails', async () => {
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				response: null,
				error: 'Network error',
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});

		const onError = vi.fn();
		render(
			<SelectProject
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(
			'Failed to load projects. Reason: Network error. Please check your network connection or credentials and try again.',
		);
	});

	it('should handle empty project list gracefully', async () => {
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				response: [],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});

		const onError = vi.fn();
		const { lastFrame } = render(
			<SelectProject
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Select a project/);
		expect(lastFrame()).not.toMatch(/Project 1/);
		expect(lastFrame()).not.toMatch(/Project 2/);
		expect(onError).not.toHaveBeenCalled();
	});
});

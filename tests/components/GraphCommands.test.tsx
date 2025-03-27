import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import Graph from '../../source/components/GraphCommands';
import { useAuth } from '../../source/components/AuthProvider.js';
import { useProjectAPI } from '../../source/hooks/useProjectAPI.js';
import { useEnvironmentApi } from '../../source/hooks/useEnvironmentApi.js';
import { useGraphDataApi } from '../../source/hooks/useGraphDataApi.js';

// --- Mocks ---
vi.mock('../../source/components/AuthProvider.js', () => ({
	useAuth: vi.fn(),
}));

vi.mock('../../source/hooks/useProjectAPI.js', () => ({
	useProjectAPI: vi.fn(),
}));

vi.mock('../../source/hooks/useEnvironmentApi.js', () => ({
	useEnvironmentApi: vi.fn(),
}));

vi.mock('../../source/hooks/useGraphDataApi.js', () => ({
	useGraphDataApi: vi.fn(),
}));

// Helper function: Waits for the rendered output to meet a condition.
const waitForOutput = async (
	instance: any,
	condition: (output: string) => boolean,
	timeout = 5000,
) => {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const output = instance.lastFrame() || '';
		if (condition(output)) return output;
		await new Promise(r => setTimeout(r, 50));
	}
	throw new Error('Timeout waiting for output');
};

describe('Graph component', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should show message if no graph data is present', async () => {
		// Provide complete scope in the useAuth mock.
		(useAuth as any).mockReturnValue({
			authToken: 'token',
			loading: false,
			error: null,
			scope: { project_id: '1', environment_id: '1' },
		});
		// These mocks are not used anymore by the Graph component now, but you can keep them
		(useProjectAPI as any).mockReturnValue({
			getProjects: vi.fn().mockResolvedValue({
				data: [{ name: 'Project 1', id: '1' }],
				error: null,
			}),
		});
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi.fn().mockResolvedValue({
				data: [{ name: 'Env 1', id: '1' }],
				error: null,
			}),
		});
		(useGraphDataApi as any).mockReturnValue({
			fetchGraphData: vi.fn().mockResolvedValue({
				data: { nodes: [] },
				error: null,
			}),
		});
		const { lastFrame } = render(<Graph />);
		await waitForOutput({ lastFrame }, out =>
			out.includes('Environment does not contain any data'),
		);
		expect(lastFrame()).toContain('Environment does not contain any data');
	});

	it('should show success message when graph is generated', async () => {
		(useAuth as any).mockReturnValue({
			authToken: 'token',
			loading: false,
			error: null,
			scope: { project_id: '1', environment_id: '1' },
		});
		(useProjectAPI as any).mockReturnValue({
			getProjects: vi.fn().mockResolvedValue({
				data: [{ name: 'Project 1', id: '1' }],
				error: null,
			}),
		});
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi.fn().mockResolvedValue({
				data: [{ name: 'Env 1', id: '1' }],
				error: null,
			}),
		});
		(useGraphDataApi as any).mockReturnValue({
			fetchGraphData: vi.fn().mockResolvedValue({
				data: { nodes: [{ id: 'node1' }], edges: [] },
				error: null,
			}),
		});
		const { lastFrame } = render(<Graph  />);
		await waitForOutput({ lastFrame }, out =>
			out.includes('Graph generated successfully and saved as HTML!'),
		);
		expect(lastFrame()).toContain(
			'Graph generated successfully and saved as HTML!'
		);
	});
});

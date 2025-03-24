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
	timeout = 15000,
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
		(useAuth as any).mockReturnValue({
			authToken: 'token',
			loading: false,
			error: null,
		});
		(useProjectAPI as any).mockReturnValue({
			getProjects: vi
				.fn()
				.mockResolvedValue({
					data: [{ name: 'Project 1', id: '1' }],
					error: null,
				}),
		});
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi
				.fn()
				.mockResolvedValue({ data: [{ name: 'Env 1', id: '1' }], error: null }),
		});
		(useGraphDataApi as any).mockReturnValue({
			fetchGraphData: vi
				.fn()
				.mockResolvedValue({ data: { nodes: [] }, error: null }),
		});
		const { lastFrame, stdin } = render(<Graph options={{}} />);
		await waitForOutput({ lastFrame }, out => out.includes('Select a project'));
		// Simulate selections.
		stdin.write('\u001B[B');
		stdin.write('\r');
		await waitForOutput({ lastFrame }, out =>
			out.includes('Select an environment'),
		);
		stdin.write('\u001B[B');
		stdin.write('\r');
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
		});
		(useProjectAPI as any).mockReturnValue({
			getProjects: vi
				.fn()
				.mockResolvedValue({
					data: [{ name: 'Project 1', id: '1' }],
					error: null,
				}),
		});
		(useEnvironmentApi as any).mockReturnValue({
			getEnvironments: vi
				.fn()
				.mockResolvedValue({ data: [{ name: 'Env 1', id: '1' }], error: null }),
		});
		(useGraphDataApi as any).mockReturnValue({
			fetchGraphData: vi
				.fn()
				.mockResolvedValue({
					data: { nodes: [{ id: 'node1' }], edges: [] },
					error: null,
				}),
		});
		const { lastFrame, stdin } = render(<Graph options={{}} />);
		await waitForOutput({ lastFrame }, out => out.includes('Select a project'));
		// Simulate project selection.
		stdin.write('\u001B[B');
		stdin.write('\r');
		await waitForOutput({ lastFrame }, out =>
			out.includes('Select an environment'),
		);
		// Simulate environment selection.
		stdin.write('\u001B[B');
		stdin.write('\r');
		await waitForOutput({ lastFrame }, out =>
			out.includes('Graph generated successfully and saved as HTML!'),
		);
		expect(lastFrame()).toContain(
			'Graph generated successfully and saved as HTML!',
		);
	});
});

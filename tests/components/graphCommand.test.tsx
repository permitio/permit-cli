vi.mock('../../source/lib/api.js', () => ({
	apiCall: vi.fn(), // This will be our mock function.
}));

vi.mock('../../source/components/HtmlGraphSaver.js', () => ({
	saveHTMLGraph: vi.fn(),
}));

vi.mock('../../source/components/generateGraphData.js', () => ({
	generateGraphData: vi.fn(),
}));

vi.mock('../../source/components/AuthProvider.js', () => ({
	// Return a dummy AuthProvider that simply renders its children.
	AuthProvider: ({ children }) => children,
	useAuth: () => ({
		authToken: 'test-token',
		loading: false,
		error: null,
	}),
}));


import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Graph from '../../source/commands/graph.js'; // Adjust path as needed
import { apiCall } from '../../source/lib/api.js';
import { saveHTMLGraph } from '../../source/components/HtmlGraphSaver.js';
import { generateGraphData } from '../../source/components/generateGraphData.js';

const projectsData = [{ name: 'Project 1', id: 'p1' }];
const environmentsData = [{ name: 'Environment 1', id: 'e1' }];
const resourceInstancesData = [
	{
		resource: 'Resource',
		resource_id: 'r1',
		id: 'r1',
		key: 'k1',
		relationships: [],
	},
];
const usersData: any[] = []; 

// Helper function: Polls instance.lastFrame() until condition(output) is true or timeout.
const waitForOutput = async (
	instance: ReturnType<typeof render>,
	condition: (output: string) => boolean,
	timeout = 100000
) => {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const output = instance.lastFrame() || '';
		if (condition(output)) {
			return output; 
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
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

	it(
		'completes the interactive flow and renders the success message',
		async () => {
			(apiCall as any)
				.mockResolvedValueOnce({ response: projectsData }) // Projects API call
				.mockResolvedValueOnce({ response: environmentsData }) // Environments API call
				.mockResolvedValueOnce({
					response: { data: resourceInstancesData },
				}) // Resource instances API call
				.mockResolvedValueOnce({
					response: { data: usersData },
				}); // User roles API call

			// Make generateGraphData return valid graph data (with nodes so that HTML is saved).
			(generateGraphData as any).mockReturnValue({
				nodes: [{ data: { id: 'node1', label: 'Node 1' } }],
				edges: [],
			});

			// Render the component with a valid API key option.
			const instance = render(<Graph options={{ apiKey: 'test-key' }} />);

			// Wait for the "Select a project" prompt.
			let output = await waitForOutput(instance, (out) => out.includes('Select a project'));

			// Simulate selecting the project.
			// Send an arrow-down and then Enter twice to ensure the selection is registered.
			instance.stdin.write('\u001B[B');
			await new Promise((r) => setTimeout(r, 100));
			instance.stdin.write('\r');
			await new Promise((r) => setTimeout(r, 200));

			// Wait for the "Select an environment" prompt.
			output = await waitForOutput(instance, (out) => out.includes('Select an environment'));
			console.log("After environment prompt:", output);

			// Simulate selecting the environment.
			instance.stdin.write('\u001B[B');
			await new Promise((r) => setTimeout(r, 100));
			instance.stdin.write('\r');
			await new Promise((r) => setTimeout(r, 200));

			// Wait for the final success message.
			output = await waitForOutput(instance, (out) =>
				out.includes('Graph generated successfully and saved as HTML!')
			);

			// Assert that saveHTMLGraph was called.
			expect(saveHTMLGraph).toHaveBeenCalled();

			// Optionally, verify that the first apiCall was made with the expected arguments.
			expect(apiCall).toHaveBeenNthCalledWith(1, 'v2/projects', 'test-token');
		},
		30000 
	);
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import ImplementComponent from '../../../source/components/init/ImplementComponent.js';

import * as Utils from '../../../source/utils/init/utils.js'; // getFormatedFile, installationCommand
import * as AuthProvider from '../../../source/components/AuthProvider.js'; // useAuth

vi.mock('../../../source/utils/init/utils.js', () => ({
	getFormatedFile: vi.fn(),
	installationCommand: {
		node: 'npm install',
		python: 'pip install',
		java: 'mvn install',
		go: 'go get',
		ruby: 'gem install',
		dotnet: 'dotnet add package',
	},
}));

vi.mock('../../../source/components/AuthProvider.js', () => ({
	useAuth: vi.fn(),
}));

describe('ImplementComponent CLI', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(AuthProvider.useAuth as any).mockReturnValue({
			authToken: 'mock-auth-token',
		});
	});

	it('renders initial state with language options', () => {
		const { lastFrame } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		const output = lastFrame();
		expect(output).toContain('Select a Language');
		expect(output).toContain('Node.js');
	});

	it('transitions to processing on language selection', () => {
		const { lastFrame, stdin } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		stdin.write('\r'); // Select "Node.js"
		const output = lastFrame();
		expect(output).toContain('Loading code sample');
	});

	it('renders install command and code on success', () => {
		(Utils.getFormatedFile as any).mockReturnValue(
			'console.log("hello world");',
		);

		const { stdin, lastFrame } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		stdin.write('\r'); // Select "Node.js"

		const output = lastFrame();
		expect(output).toContain('Installation:');
		expect(output).toContain('npm install');
		expect(output).toContain('console.log("hello world");');
	});

	it('calls onComplete when "Complete Setup" is selected', () => {
		(Utils.getFormatedFile as any).mockReturnValue('console.log("done");');

		const { stdin, lastFrame } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		stdin.write('\r'); // Select language
		stdin.write('\r'); // Select "Complete Setup"

		expect(mockOnComplete).toHaveBeenCalledOnce();
	});

	it('calls onError and renders error if getFormatedFile throws', () => {
		(Utils.getFormatedFile as any).mockImplementation(() => {
			throw new Error('API broke');
		});

		const { stdin, lastFrame } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		stdin.write('\r'); // Select language

		const output = lastFrame();
		expect(output).toContain('Error: API broke');
		expect(mockOnError).toHaveBeenCalledWith('API broke');
	});

	it('renders error if no API key or token is present', () => {
		(AuthProvider.useAuth as any).mockReturnValue({ authToken: null });

		const { stdin, lastFrame } = render(
			<ImplementComponent
				action="create"
				resource="project"
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		stdin.write('\r'); // Select language

		const output = lastFrame();
		expect(output).toContain('Error: No API key or auth token available');
		expect(mockOnError).toHaveBeenCalledWith(
			'No API key or auth token available',
		);
	});
});

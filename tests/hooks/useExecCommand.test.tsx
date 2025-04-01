import React, { useState, useEffect } from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useExecCommand from '../../source/hooks/useExecCommand.js';
import { Box, Text } from 'ink';
import { exec } from 'child_process';

// Mock child_process and util
vi.mock('child_process', () => ({
	exec: vi.fn(),
}));

vi.mock('util', () => ({
	promisify: vi.fn(fn => async (command: string, options?: any) => {
		return new Promise((resolve, reject) => {
			fn(
				command,
				options,
				(error: Error | null, stdout: string, stderr: string) => {
					if (error) reject(error);
					else resolve({ stdout, stderr });
				},
			);
		});
	}),
}));

// Temporary component to test the hook
const TestComponent = ({
	command,
	options,
}: {
	command: string;
	options?: any;
}) => {
	const { exec, error } = useExecCommand();
	const [output, setOutput] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		const executeCommand = async () => {
			setIsLoading(true);
			try {
				const result = await exec(command, options);
				setOutput(`stdout: ${result.stdout}\nstderr: ${result.stderr}`);
			} catch (err) {
				// Error already set in the hook
			} finally {
				setIsLoading(false);
			}
		};

		executeCommand();
	}, [command, exec, options]);

	return (
		<Box flexDirection="column">
			{isLoading && <Text>Loading...</Text>}
			{error && <Text>Error: {error}</Text>}
			{output && <Text>Output: {output}</Text>}
		</Box>
	);
};

describe('useExecCommand', () => {
	const mockedExec = vi.mocked(exec);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('executes command and returns output', async () => {
		mockedExec.mockImplementation((cmd, opts, callback) => {
			if (callback) callback(null, 'command output', '');
			return {} as any;
		});

		const { lastFrame, frames } = render(
			<TestComponent command="test command" />,
		);

		// Wait for the component to update
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Output: stdout: command output');
		expect(mockedExec).toHaveBeenCalledWith(
			'test command',
			expect.any(Object),
			expect.any(Function),
		);
	});

	it('handles command errors', async () => {
		mockedExec.mockImplementation((cmd, opts, callback) => {
			if (callback) callback(new Error('Command failed'), '', 'error output');
			return {} as any;
		});

		const { lastFrame, frames } = render(
			<TestComponent command="failing command" />,
		);

		// Wait for the component to update
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('Error: Command failed');
	});

	it('passes timeout option to exec', async () => {
		mockedExec.mockImplementation((cmd, opts, callback) => {
			if (callback) callback(null, `timeout: ${(opts as any).timeout}`, '');
			return {} as any;
		});

		const { lastFrame, frames } = render(
			<TestComponent command="test command" options={{ timeout: 5000 }} />,
		);

		// Wait for the component to update
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(lastFrame()).toContain('stdout: timeout: 5000');
		expect(mockedExec).toHaveBeenCalledWith(
			'test command',
			expect.objectContaining({ timeout: 5000 }),
			expect.any(Function),
		);
	});
});

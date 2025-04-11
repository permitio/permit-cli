import { useState, useCallback } from 'react';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(execCallback);

type ExecOptions = {
	timeout?: number;
};

export default function useExecCommand() {
	const [error, setError] = useState<string | null>(null);

	const exec = useCallback(
		async (command: string, options: ExecOptions = {}) => {
			const { timeout } = options;

			try {
				setError(null);
				const { stdout, stderr } = await execPromise(command, { timeout });
				// Return both stdout and stderr
				return { stdout, stderr };
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
				throw err;
			}
		},
		[],
	);

	return { error, exec };
}

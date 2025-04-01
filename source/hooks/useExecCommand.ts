import { useState, useCallback } from 'react';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(execCallback);

export default function useExecCommand() {
	const [error, setError] = useState<string | null>(null);

	const exec = useCallback(async (command: string) => {
		try {
			setError(null);
			const { stdout, stderr } = await execPromise(command);
			if (stderr && !stdout) {
				setError(stderr);
				throw new Error(stderr);
			}

			return stdout;
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			throw err;
		}
	}, []);
	return { error, exec };
}

import pathModule from 'node:path';
import fs from 'node:fs/promises';

export const saveFile = async (path: string, data: string) => {
	try {
		const dir = pathModule.dirname(path ?? '');
		// Ensure the directory exists
		await fs.mkdir(dir, { recursive: true });

		await fs.writeFile(path, data, 'utf8');
		return { error: null };
	} catch (err) {
		return { error: err instanceof Error ? err.message : '' };
	}
};

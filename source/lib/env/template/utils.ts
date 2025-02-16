import * as fs from 'fs';
import * as path from 'path';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';

export function getFiles(): string[] {
	try {
		const directory = 'source/templates';
		return fs.readdirSync(directory).map(file => path.parse(file).name);
	} catch (error) {
		throw error;
	}
}

function getFileContent(fileName: string): string {
	try {
		const directory = 'source/templates';
		const filePath = path.join(directory, fileName);
		return fs.readFileSync(filePath, 'utf-8');
	} catch (error) {
		throw error;
	}
}

export async function ApplyTemplate(
	fileName: string,
	apiKey: string,
): Promise<string> {
	try {
		const fileContent = getFileContent(fileName);
		const options: RequestInit = {
			method: 'POST',
			headers: {
				Accept: '*/*',
				Authorization: `${apiKey}`,
				'Content-Type': 'application/x-hcl',
			},
			body: fileContent,
		};
		const res = await fetch(`${TERRAFORM_PERMIT_URL}/apply`, options);
		if (!res.ok) {
			const err = await res.json();
			return `Error: Request failed with status code: ${res.status}: ${err.error}`;
		} else {
			return `Success: The terraform template is applied successfully.`;
		}
	} catch (error) {
		return `Error: ${error instanceof Error ? error.message : (error as string)}`;
	}
}

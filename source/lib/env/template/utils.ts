import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';
import { exec } from 'child_process';

export function getFiles(): string[] {
	const directory = 'source/templates';
	return fs.readdirSync(directory).map(file => path.parse(file).name);
}

function getFileContent(fileName: string): string {
	const directory = 'source/templates';
	const filePath = path.join(directory, fileName + '.tf');
	return fs.readFileSync(filePath, 'utf-8');
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
		console.log(error);
		return `Error: ${error instanceof Error ? error.message : (error as string)}`;
	}
}

export async function ApplyTemplateLocally(
	fileName: string,
	apiKey: string,
): Promise<string> {
	try {
		const fileContent = getFileContent(fileName).replace(
			'{{API_KEY}}',
			'"' + apiKey + '"',
		);

		const tempDir = path.join(os.tmpdir(), `teraform-temp-${Date.now()}`);
		fs.mkdirSync(tempDir, { recursive: true });

		const tempPath = path.join(tempDir, 'main.tf');
		fs.writeFileSync(tempPath, fileContent, 'utf-8');

		const runCommand = (cmd: string) => {
			return new Promise<string>((resolve, reject) => {
				exec(cmd, { cwd: tempDir }, (error, stdout, stderr) => {
					if (error) return reject(`${error.message}`);
					if (stderr) return reject(`Terraform Error: ${stderr}`);
					resolve(stdout);
				});
			});
		};
		await runCommand('terrafrom init');
		const applyOutput = await runCommand(
			`terraform apply -auto-approve ${tempPath}`,
		);

		fs.unlinkSync(tempPath);
		fs.rmdirSync(tempDir, { recursive: true });
		return `Success: Terraform Appled successfully \n Terraform Output: ${applyOutput}`;
	} catch (error) {
		return `Error: ${error instanceof Error ? error.message : (error as string)}`;
	}
}

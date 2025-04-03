import * as fs from 'node:fs';
import * as path from 'node:path';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Manually define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
			return `Success: The environment template is applied successfully.`;
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
	const tempDir = `temp-${Math.random().toString(36).substring(7)}`;
	const TF_File = path.join(__dirname, `${tempDir}/config.tf`);
	const tempDirPath = path.join(__dirname, tempDir);

	try {
		const tfContent = getFileContent(fileName).replace(
			'{{API_KEY}}',
			'"' + apiKey + '"',
		);
		const dirPath = path.dirname(TF_File);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
		fs.writeFileSync(TF_File, tfContent, 'utf-8');

		return new Promise((resolve, reject) => {
			exec(
				'terraform init && terraform apply --auto-approve',
				{ cwd: tempDirPath },
				(error, stdout, stderr) => {
					if (error) {
						reject(`Error: ${stderr || error.message}`);
					} else {
						resolve(
							`Success: Terraform applied successfully.\nTerraform Output: ${stdout}`,
						);
					}
				},
			);
		});
	} catch (error) {
		return `Error: ${error instanceof Error ? error.message : (error as string)}`;
	} finally {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
}

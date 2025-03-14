import * as fs from 'fs';
import * as path from 'path';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';
import { execSync } from 'child_process';

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

		const applyOutput = execSync(
			'terraform init && terraform apply --auto-approve',
			{
				cwd: tempDir,
				stdio: 'pipe',
			},
		);

		return `Success: Terraform applied successfully.\nTerraform Output: ${applyOutput}`;
	} catch (error) {
		return `Error: ${error instanceof Error ? error.message : (error as string)}`;
	} finally {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
}

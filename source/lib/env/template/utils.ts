import * as fs from 'fs';
import * as path from 'path';
import { TERRAFORM_PERMIT_URL } from '../../../config.js';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Manually define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDirectory(): string {
	return path.join(__dirname, '..', '..', '..', '..', 'dist', 'templates');
}

export function getFiles(): string[] {
	const directory = getDirectory();
	return fs.readdirSync(directory).map(file => path.parse(file).name);
}

function getFileContent(fileName: string): string {
	const directory = getDirectory();
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

type ResourceActionMap = {
	resource: string;
	actions: string[];
};

export function extractResourcesAndActions(
	tfString: string,
): ResourceActionMap[] {
	const lines = tfString.split('\n').map(line => line.trim());
	const resources: ResourceActionMap[] = [];

	let currentResource: ResourceActionMap | null = null;
	let inActionsBlock = false;

	for (const line of lines) {
		// Match resource declaration
		if (line.startsWith('resource "permitio_resource"')) {
			const match = line.match(/"permitio_resource"\s+"(.+?)"/);
			if (match && match[1]) {
				currentResource = {
					resource: match[1],
					actions: [],
				};
			}
		}

		if (currentResource) {
			// Detect start of actions block
			if (line === 'actions = {') {
				inActionsBlock = true;
				continue;
			}

			// Detect end of actions block
			if (inActionsBlock && line === '}') {
				inActionsBlock = false;
				continue;
			}

			// While in actions block, extract keys
			if (inActionsBlock) {
				const actionMatch = line.match(/"(.+?)"\s*=/);
				if (actionMatch && actionMatch[1]) {
					currentResource.actions.push(actionMatch[1]);
				}
			}

			// Close off the resource block (assuming it ends after actions)
			if (line === '}' && !inActionsBlock) {
				resources.push(currentResource);
				currentResource = null;
			}
		}
	}

	return resources;
}

export function getResourceAndAction(fileName: string): {
	resource: string;
	action: string;
} {
	try {
		const fileContent = getFileContent(fileName);
		const resourcesAndActions = extractResourcesAndActions(fileContent);
		if (
			resourcesAndActions.length > 0 &&
			resourcesAndActions[0] &&
			resourcesAndActions[0].actions.length > 0
		) {
			const resource = resourcesAndActions[0].resource;
			const action = resourcesAndActions[0].actions[0] || '';
			return { resource, action };
		}
		return { resource: '', action: '' };
	} catch {
		return { resource: '', action: '' };
	}
}

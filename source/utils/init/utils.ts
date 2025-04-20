import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Create the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const implementDir = path.join(__dirname, '../', '../', 'implement');

function getFileContent(fileName: string) {
	const filePath = path.join(implementDir, fileName);
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
	const content = fs.readFileSync(filePath, 'utf-8');
	return content;
}

export function getFormatedFile(
	fileName: string,
	apiKey: string,
	action: string,
	resource: string,
	userId?: string,
	userEmail?: string,
	userFirstName?: string,
	userLastName?: string,
) {
	const fileContent = getFileContent(fileName);
	const formattedContent = fileContent
		.replace(/<<API_KEY>>/g, apiKey)
		.replace(/<<ACTIONS>>/g, action)
		.replace(/<<RESOURCES>>/g, resource)
		.replace(/<<USER_ID>>/g, userId || '')
		.replace(/<<EMAIL>>/g, userEmail || '')
		.replace(/<<FIRST_NAME>>/g, userFirstName || '')
		.replace(/<<LAST_NAME>>/g, userLastName || '');

	return formattedContent;
}

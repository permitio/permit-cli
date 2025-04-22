import fs from 'fs';
import path from 'path';

const implementDir = 'source/implement';

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

export const installationCommand = {
	python: 'pip install permit fastapi "uvicorn[standard]"',
	node: 'npm install permitio',
	ruby: 'gem install permit-sdk webrick',
	java: `// add this line to install the Permit.io Java SDK in your project
             implementation 'io.permit:permit-sdk-java'`,
	dotnet: `dotnet add package Permit`,
	go: `go get github.com/permitio/permit-golang`,
};

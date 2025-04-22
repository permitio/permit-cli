import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

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
	// Get the template content
	const templateContent = getFileContent(fileName);

	// Compile the Handlebars template
	const template = Handlebars.compile(templateContent);

	// Define the context with all variables
	const context = {
		API_KEY: apiKey,
		ACTIONS: action,
		RESOURCES: resource,
		USER_ID: userId || '',
		EMAIL: userEmail || '',
		FIRST_NAME: userFirstName || '',
		LAST_NAME: userLastName || '',
	};

	// Render the template with the context
	return template(context);
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

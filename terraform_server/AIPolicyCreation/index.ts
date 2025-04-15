import { openai } from '@ai-sdk/openai';
import { CoreMessage, streamText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';
import * as readline from 'node:readline/promises';

dotenv.config();

const terminal = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const messages: CoreMessage[] = [
	{
		role: 'system',
		content: `You are an intelligent assistant that converts natural language into structured Role-Based Access Control (RBAC) policies.

Always reply with this JSON format:

{
  resources: [{
    name: string,
    actions: string[]
  }],
  roles: [{
    name: string,
    permissions: [{
      resource: string,
      actions: string[]
    }]
  }]
}

Your task:
- Understand the user's intent, even if they don't mention "policy", "roles", or "permissions".
- If the user describes a product, app, feature, organization, or use case — infer the implied access control.
- Extract or invent logical roles, resources, actions, and permissions based on what the system would realistically need.
- Use common sense and real-world examples (e.g., fintech = users, admins, money transfers, approvals).
- Avoid asking follow-up questions unless absolutely necessary.
- Always output valid JSON and Terraform file using the permit.io terraform provider. Do not add explanations or text outside the JSON and the Terraform file.

Example input:
"I'm building a platform for patients to view their health records. Doctors can edit them."

Expected output:
{
  "resources": [{
    "name": "health records",
    "actions": ["view", "edit"]
  }],
  "roles": [{
    "name": "Patient",
    "permissions": [{
      "resource": "health records",
      "actions": ["view"]
    }]
  }, {
    "name": "Doctor",
    "permissions": [{
      "resource": "health records",
      "actions": ["edit", "view"]
    }]
  }]
}

Even if the prompt sounds like a general product description, assume it's your job to translate it into an access control policy.
`,
	},
	{
		role: 'system',
		content: `You are also familiar with the Permit Terraform provider, which allows managing Permit.io resources as code.

Key Permit.io resources available in the Terraform provider:

1. permitio_resource - Defines resources in your system
   - Required attributes:
     * key (string) - Unique identifier for the resource
     * name (string) - Display name for the resource
     * actions (map) - Map of action keys to action names
   - Optional attributes:
     * description (string) - Description of the resource
     * attributes (map) - Custom attributes for the resource
   - Example:
     resource "permitio_resource" "document" {
  key         = "document"
  name        = "document"
  description = "a new document"
  actions = {
    "read" = {
      "name" = "read"
    }
    "write" = {
      "name" = "write"
    }
    "delete" = {
      "name"        = "delete"
      "description" = "delete a document"
    }
  }
  }

2. permitio_role - Defines roles in your system
   - Required attributes:
     * key (string) - Unique identifier for the role
     * name (string) - Display name for the role
   - Optional attributes:
     * description (string) - Description of the role
     * permissions (list of objects) - List of permissions granted to this role
   - Example:
     resource "permitio_role" "writer" {
  key         = "writer"
  name        = "writer"
  description = "a new admin"
  permissions = ["document:read", "document:write", "document:delete"]
  depends_on = [
    "permitio_resource.document"
  ]
}




When creating policies, consider these resources and their relationships to build a complete access control system. You should be able to generate Terraform configurations for any policy described in the JSON format.`,
	},
];

async function main() {
	while (true) {
		const userInput = await terminal.question('You: ');

		messages.push({ role: 'user', content: userInput });

		const result = streamText({
			model: openai('gpt-4'),
			messages,
			tools: {
				analyzePolicy: tool({
					description: 'Analyze a policy description and extract required components',
					parameters: z.object({
						description: z.string().describe('The policy description to analyze'),
					}),
					execute: async ({  }) => {
						// This is a mock implementation - replace with actual analysis logic
						return {
							components: {
								resources: [],
								actions: [],
								roles: [],
								permissions: [],
							},
							suggestions: [],
						};
					},
				}),
				createPolicy: tool({
					description: 'Create a policy based on extracted components',
					parameters: z.object({
						resource: z.string().describe('The resource being accessed'),
						actions: z.array(z.string()).describe('Actions that can be performed'),
						role: z.string().describe('The role that has access'),
						permissions: z.array(z.string()).describe('Permissions granted to the role'),
					}),
					execute: async ({ resource, actions, role, permissions }) => ({
						policy: {
							resource,
							actions,
							role,
							permissions,
						},
					}),
				}),
				validatePolicy: tool({
					description: 'Validate a policy against security best practices',
					parameters: z.object({
						policy: z.object({
							resource: z.string(),
							actions: z.array(z.string()),
							role: z.string(),
							permissions: z.array(z.string()),
						}),
					}),
					execute: async ({  }) => ({
						isValid: true,
						suggestions: [],
						warnings: [],
					}),
				}),
				generateTerraform: tool({
					description: 'Generate Terraform configuration for a policy',
					parameters: z.object({
						policy: z.object({
							resources: z.array(z.object({
								name: z.string(),
								actions: z.array(z.string()),
							})),
							roles: z.array(z.object({
								name: z.string(),
								permissions: z.array(z.object({
									resource: z.string(),
									actions: z.array(z.string()),
								})),
							})),
						}),
					}),
					execute: async ({ policy }) => {
						// Convert resource names to keys (lowercase, no spaces)
						const resourceKeys = policy.resources.map(r => ({
							...r,
							key: r.name.toLowerCase().replace(/\s+/g, '_'),
						}));

						// Convert role names to keys
						const roleKeys = policy.roles.map(r => ({
							...r,
							key: r.name.toLowerCase().replace(/\s+/g, '_'),
						}));

						const terraform = `terraform {
  required_providers {
    permitio = {
      source  = "registry.terraform.io/permitio/permit-io"
      version = "~> 0.0.1"
    }
  }
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = "" // Set this to Permit.io API key
}

${resourceKeys.map(r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" = { "name" = "${a}" }`).join(',\n    ')}
  }
}`).join('\n\n')}

${roleKeys.map(r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions.map(p => `"${p.resource.toLowerCase()}:${p.actions.join(',')}"`).join(',\n    ')}
  ]
}`).join('\n\n')}
`;

						// Write the Terraform configuration to a file
						const fs = require('fs');
						const path = require('path');
						const outputDir = path.join(process.cwd(), 'terraform_output');

						// Create the output directory if it doesn't exist
						if (!fs.existsSync(outputDir)) {
							fs.mkdirSync(outputDir, { recursive: true });
						}

						// Write the Terraform configuration to a file
						const outputPath = path.join(outputDir, 'policy.tf');
						fs.writeFileSync(outputPath, terraform);

						return {
							terraform,
							outputPath,
							message: `Terraform configuration has been written to ${outputPath}`
						};
					},
				}),
			},
		});

		let fullResponse = '';
		process.stdout.write('\nAssistant: ');
		for await (const delta of result.textStream) {
			fullResponse += delta;
			process.stdout.write(delta);
		}
		process.stdout.write('\n\n');

		// Wait for the stream to complete before accessing toolCalls and toolResults
		const [toolCalls, toolResults] = await Promise.all([
			result.toolCalls,
			result.toolResults,
		]);

		console.log('Tool Calls:', toolCalls);
		console.log('Tool Results:', toolResults);
		messages.push({ role: 'assistant', content: fullResponse });
	}
}

main().catch(console.error);

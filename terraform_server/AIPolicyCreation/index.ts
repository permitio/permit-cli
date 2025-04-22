import { openai } from '@ai-sdk/openai';
import { CoreMessage, streamText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';
import * as readline from 'node:readline/promises';
import chalk from 'chalk';

// Use require for cli-table
const Table = require('cli-table');

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
- Don't use the keys "admin", "viewer", "editor" for roles.
- In the terraform file, add field of "attributes" with empty object {} for each resource.
- Always output as a table with the following format:
| Resource Name | Actions |
| Role Name | Permissions |
- after the table, ask the user if they want to generate a terraform file for the policy.
- If the user says "yes", generate a terraform file with the following format:
	- For the resource block, use the following format:
		resource "permitio_resource" "resource_name" {
			key         = "resource_name"
			name        = "Resource Name"
			description = "Description of the resource"
			attributes  = {}
			actions     = {
				"action1" : { "name" : "Action 1" },
				"action2" : { "name" : "Action 2" }
			}
		}
	- For the role block, use the following format:
		resource "permitio_role" "role_name" {
			key         = "role_name"
			name        = "Role Name"
			description = "Description of the role"
			permissions = ["resource_name:action1", "resource_name:action2"]
			depends_on = [
				permitio_resource.resource_name
			]
		}
- For the Terraform file, use the following format for the provider block:
	terraform {
		required_providers {
			permitio = {
				source  = "registry.terraform.io/permitio/permit-io"
				version = "~> 0.0.14"
			}
		}
	}
	provider "permitio" {
		api_url = "https://api.permit.io"
		api_key = "" // Set this to Permit.io API key
	}



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
  attributes = {}
  actions = {
    "get" : { "name" : "Get" },
    "insert" : { "name" : "Insert" },
    "update" : { "name" : "Update" },
    "delete" : { "name" : "Delete" },
    "create" : { "name" : "Create" },
    "read" : { "name" : "Read"}
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
    permitio_resource.document
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
					description:
						'Analyze a policy description and extract required components',
					parameters: z.object({
						description: z
							.string()
							.describe('The policy description to analyze'),
					}),
					execute: async ({}) => {
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
						actions: z
							.array(z.string())
							.describe('Actions that can be performed'),
						role: z.string().describe('The role that has access'),
						permissions: z
							.array(z.string())
							.describe('Permissions granted to the role'),
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
					execute: async ({}) => ({
						isValid: true,
						suggestions: [],
						warnings: [],
					}),
				}),
				generateTerraform: tool({
					description: 'Generate Terraform configuration for a policy',
					parameters: z.object({
						policy: z.object({
							resources: z.array(
								z.object({
									name: z.string(),
									actions: z.array(z.string()),
								}),
							),
							roles: z.array(
								z.object({
									name: z.string(),
									permissions: z.array(
										z.object({
											resource: z.string(),
											actions: z.array(z.string()),
										}),
									),
								}),
							),
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

${resourceKeys
	.map(
		r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  attributes  = {}
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" : { "name" : "${a.charAt(0).toUpperCase() + a.slice(1)}" }`).join(',\n    ')}
  }
}`,
	)
	.join('\n\n')}

${roleKeys
	.map(
		r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions.map(p => `"${p.resource.toLowerCase()}:${p.actions.join(',')}"`).join(',\n    ')}
  ]
}`,
	)
	.join('\n\n')}
`;

						// Validate the Terraform configuration
						const validateTerraform = (
							tf: string,
						): { isValid: boolean; errors: string[] } => {
							const errors: string[] = [];

							// Check for required blocks
							if (!tf.includes('terraform {')) {
								errors.push('Missing terraform block');
							}

							if (!tf.includes('required_providers {')) {
								errors.push('Missing required_providers block');
							}

							if (!tf.includes('provider "permitio" {')) {
								errors.push('Missing permitio provider block');
							}

							// Check for resource blocks
							if (!tf.includes('resource "permitio_resource"')) {
								errors.push('Missing permitio_resource blocks');
							}

							if (!tf.includes('resource "permitio_role"')) {
								errors.push('Missing permitio_role blocks');
							}

							// Check for syntax errors (basic checks)
							const openBraces = (tf.match(/{/g) || []).length;
							const closeBraces = (tf.match(/}/g) || []).length;

							if (openBraces !== closeBraces) {
								errors.push(
									`Mismatched braces: ${openBraces} opening vs ${closeBraces} closing`,
								);
							}

							// Check for resource references
							const resourceRefs =
								tf.match(/permitio_resource\.[a-zA-Z0-9_]+/g) || [];
							const resourceDefs =
								tf.match(/resource "permitio_resource" "([a-zA-Z0-9_]+)"/g) ||
								[];

							const resourceDefNames = resourceDefs
								.map(def => {
									const match = def.match(
										/resource "permitio_resource" "([a-zA-Z0-9_]+)"/,
									);
									return match ? match[1] : null;
								})
								.filter(Boolean);

							resourceRefs.forEach(ref => {
								const refName = ref.split('.')[1];
								if (!resourceDefNames.includes(refName)) {
									errors.push(`Reference to undefined resource: ${ref}`);
								}
							});

							// Check for action format
							const actionBlocks = tf.match(/actions\s*=\s*{([^}]*)}/g) || [];
							actionBlocks.forEach(block => {
								if (!block.includes(':')) {
									errors.push(
										'Actions should use colons (:) instead of equals (=) for key-value pairs',
									);
								}
							});

							return {
								isValid: errors.length === 0,
								errors,
							};
						};

						// Validate the Terraform configuration
						const validation = validateTerraform(terraform);

						if (!validation.isValid) {
							return {
								terraform,
								validation,
								message: `Terraform validation failed: ${validation.errors.join(', ')}`,
							};
						}

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
							validation,
							message: `Terraform configuration has been written to ${outputPath}`,
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

		// Parse the JSON response and display it as a table
		try {
			// Extract JSON from the response
			const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const jsonStr = jsonMatch[0];
				const policy = JSON.parse(jsonStr);

				// Display resources table
				if (policy.resources && policy.resources.length > 0) {
					const resourceTable = new Table({
						head: [
							chalk.hex('#00FF00')('Resource Name'),
							chalk.hex('#00FF00')('Actions'),
						],
						colWidths: [20, 40],
					});

					policy.resources.forEach(resource => {
						resourceTable.push([resource.name, resource.actions.join(', ')]);
					});

					console.log('\nResources:');
					console.log(resourceTable.toString());
				}

				// Display roles table
				if (policy.roles && policy.roles.length > 0) {
					const roleTable = new Table({
						head: [
							chalk.hex('#00FF00')('Role Name'),
							chalk.hex('#00FF00')('Permissions'),
						],
						colWidths: [20, 60],
					});

					policy.roles.forEach(role => {
						const permissions = role.permissions
							.map(p => `${p.resource}: ${p.actions.join(', ')}`)
							.join('\n');

						roleTable.push([role.name, permissions]);
					});

					console.log('\nRoles:');
					console.log(roleTable.toString());
				}
			}
		} catch (error) {
			console.error('Error parsing JSON response:', error);
		}
	}
}

main().catch(console.error);

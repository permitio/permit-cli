import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { execSync } from 'child_process';
import bodyParser from 'body-parser';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.text({ type: 'application/x-hcl' }));
app.use(bodyParser.json()); // Add JSON body parser for AI policy creation
app.use(cors());

const messages = [
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
- Always output valid JSON and Terraform file using the permit.io terraform provider.`,
	},
];

app.post('/apply', (req, res) => {
	const tempDir = `temp-${Math.random().toString(36).substring(7)}`;
	const TF_FILE = path.join(__dirname, `${tempDir}/config.tf`);

	const generateTfFile = (data, apiKey) => {
		const tfContent = data.replace('{{API_KEY}}', `"` + apiKey + `"`);
		const dirPath = path.dirname(TF_FILE);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		fs.writeFileSync(TF_FILE, tfContent, 'utf-8');
	};

	try {
		console.log('API CALL IS RECIVED');
		const apiKey = req.headers['authorization'];
		if (!apiKey) {
			return res.status(400).json({ error: 'API Key is required' });
		}
		generateTfFile(req.body, apiKey);
		const { stdout, stderr } = execSync(
			'terraform init && terraform apply -auto-approve',
			{ cwd: `${__dirname}/${tempDir}` },
		);
		if (stderr) {
			res.status(500).json({ error: stderr });
		}
		res.json({ message: 'Terraform successful', output: stdout });
	} catch (error) {
		res.status(400).json({ error: error.message });
	} finally {
		// Remove the temp directory
		fs.rmSync(`${__dirname}/${tempDir}`, { recursive: true });
		console.log('APICALL COMPLETED');
	}
});

app.post('/chat', async (req, res) => {
	const { message } = req.body;

	try {
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');

		messages.push({ role: 'user', content: message });

		const result = await streamText({
			model: openai('gpt-4'),
			messages,
			tools: {
				analyzePolicy: tool({
					description: 'Analyze a policy description and extract required components',
					parameters: z.object({
						description: z.string().describe('The policy description to analyze'),
					}),
					execute: async () => {
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
					execute: async () => ({
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

						const terraform = generateTerraformConfig(resourceKeys, roleKeys);
						return {
							terraform,
							message: 'Generated Terraform configuration',
						};
					},
				}),
			},
		});

		for await (const delta of result.textStream) {
			res.write(`data: ${JSON.stringify({ delta })}\n\n`);
		}

		const [toolCalls, toolResults] = await Promise.all([
			result.toolCalls,
			result.toolResults,
		]);

		res.write(`data: ${JSON.stringify({ toolCalls, toolResults })}\n\n`);
		res.end();

	} catch (error) {
		console.error('Error in chat:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

function generateTerraformConfig(resourceKeys, roleKeys) {
	return `terraform {
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

${resourceKeys.map(r => `resource "permitio_resource" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} resource"
  attributes  = {}
  actions     = {
    ${r.actions.map(a => `"${a.toLowerCase()}" : { "name" : "${a.charAt(0).toUpperCase() + a.slice(1)}" }`).join(',\n    ')}
  }
}`).join('\n\n')}

${roleKeys.map(r => `resource "permitio_role" "${r.key}" {
  key         = "${r.key}"
  name        = "${r.name}"
  description = "${r.name} role"
  permissions = [
    ${r.permissions.map(p => `"${p.resource.toLowerCase()}:${p.actions.join(',')}"`).join(',\n    ')}
  ]
}`).join('\n\n')}`;
}

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { execSync } from 'child_process';
import bodyParser from 'body-parser';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import tools from './tools/aiTools.js';
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
- return only the table output without any other text above it.
- Always output valid JSON and Terraform file using the permit.io terraform provider.
- When using tools, make sure to include the formattedOutput in your response.`,
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

		// Send the joke as a loading message
		const joke =
			"Why did the developer get locked out of production?\nBecause they didn't have the right commit-ment level of permissions.\n \n loading...";
		res.write(`data: ${JSON.stringify({ delta: joke })}\n\n`);

		// Send a message to disable user input
		res.write(`data: ${JSON.stringify({ type: 'disable_input' })}\n\n`);

		// Call the AI model to generate a policy
		const result = await streamText({
			model: openai('gpt-4'),
			messages,
			tools,
		});

		// Stream the text but don't show it to the user
		let collectedText = '';
		for await (const delta of result.textStream) {
			collectedText += delta;
			// Don't send each delta to avoid showing raw JSON
		}

		// Get the tool calls and results
		const [, toolResults] = await Promise.all([
			result.toolCalls,
			result.toolResults,
		]);

		// Check if any tool results have policy data
		const policyData = toolResults.find(
			result => result && result.policy,
		)?.policy;

		if (policyData) {
			// Send the policy data as a JSON object in the response text
			res.write(
				`data: ${JSON.stringify({ delta: JSON.stringify(policyData) })}\n\n`,
			);
		} else {
			// If no policy data, try to extract it from the collected text
			try {
				const jsonMatch = collectedText.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					const jsonStr = jsonMatch[0];
					const policy = JSON.parse(jsonStr);

					// Check if it has the expected format
					if (policy.resources && policy.roles) {
						res.write(
							`data: ${JSON.stringify({ delta: JSON.stringify(policy) })}\n\n`,
						);
					} else {
						// If it doesn't have the expected format, send an error message
						res.write(
							`data: ${JSON.stringify({ type: 'error', message: 'Invalid policy format' })}\n\n`,
						);
					}
				} else {
					// If no JSON found, send an error message
					res.write(
						`data: ${JSON.stringify({ type: 'error', message: 'No policy data found' })}\n\n`,
					);
				}
			} catch (error) {
				console.error('Error parsing JSON from collected text:', error);
				// If parsing fails, send an error message
				res.write(
					`data: ${JSON.stringify({ type: 'error', message: 'Error parsing policy data' })}\n\n`,
				);
			}
		}

		// Send a message to enable user input
		res.write(`data: ${JSON.stringify({ type: 'enable_input' })}\n\n`);

		// Send the done message
		res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
		res.end();
	} catch (error) {
		console.error('Error in chat:', error);
		res.write(
			`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
		);
		res.write(`data: ${JSON.stringify({ type: 'enable_input' })}\n\n`);
		res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
		res.end();
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

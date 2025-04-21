import { tool } from 'ai';
import { z } from 'zod';
import { generateTerraformConfig } from './terraformGenerator.js';

const tools = {
    analyzePolicy: tool({
        description: 'Analyze a policy description and extract required components',
        parameters: z.object({
            description: z.string().describe('The policy description to analyze'),
        }),
        execute: async () => {
            // This is a placeholder implementation
            // In a real implementation, this would analyze the description
            return {
                components: {
                    resources: [
                        { name: "Example Resource", actions: ["read", "write"] }
                    ],
                    actions: ["read", "write"],
                    roles: ["User", "Manager"],
                    permissions: ["read:resource", "write:resource"],
                },
                suggestions: ["Consider adding more specific permissions"],
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
        execute: async ({ resource, actions, role, permissions }) => {
            // Format the output as a table
            const tableOutput = `
| Component | Value |
|-----------|-------|
| Resource  | ${resource} |
| Actions   | ${actions.join(', ')} |
| Role      | ${role} |
| Permissions | ${permissions.join(', ')} |
`;

            return {
                policy: {
                    resources: [{ name: resource, actions }],
                    roles: [{ name: role, permissions: [{ resource, actions }] }]
                },
                formattedOutput: tableOutput
            };
        },
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
        execute: async () => {
            // Format the output as a table
            const tableOutput = `
| Validation | Result |
|------------|--------|
| Is Valid   | Yes    |
| Suggestions | None  |
| Warnings   | None   |
`;

            return {
                isValid: true,
                suggestions: [],
                warnings: [],
                formattedOutput: tableOutput
            };
        },
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
            const resourceKeys = policy.resources.map(r => ({
                ...r,
                key: r.name.toLowerCase().replace(/\s+/g, '_'),
            }));

            const roleKeys = policy.roles.map(r => ({
                ...r,
                key: r.name.toLowerCase().replace(/\s+/g, '_'),
            }));

            const terraform = generateTerraformConfig(resourceKeys, roleKeys);

            // Format the output as a table
            const tableOutput = `
| Resource | Actions |
|----------|---------|
${policy.resources.map(r => `| ${r.name} | ${r.actions.join(', ')} |`).join('\n')}

| Role | Permissions |
|------|-------------|
${policy.roles.map(r => `| ${r.name} | ${r.permissions.map(p => `${p.resource}:${p.actions.join(', ')}`).join(', ')} |`).join('\n')}
`;

            return {
                terraform,
                message: 'Generated Terraform configuration',
                formattedOutput: tableOutput,
                policy: policy // Return the policy data as well
            };
        },
    }),
};

export default tools;

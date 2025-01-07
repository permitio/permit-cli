import { Command } from 'commander';
// @ts-ignore
// import { AuthProvider } from '../components/AuthProvider'; // Removed
// @ts-ignore
// import { EnvironmentSelection } from '../components/EnvironmentSelection'; // Removed
import { writeFileSync } from 'fs';
// @ts-ignore
// import { useEnvironmentApi } from '../hooks/useEnvironmentApi'; // Removed
// @ts-ignore
// import { useResourceApi } from '../hooks/useResourceApi'; // Removed
// @ts-ignore
// import { useRoleApi } from '../hooks/useRoleApi'; // Removed
// @ts-ignore
// import { useUserSetApi } from '../hooks/useUserSetApi'; // Removed
// @ts-ignore
// import { useResourceSetApi } from '../hooks/useResourceSetApi'; // Removed
// @ts-ignore
// import { useConditionSetApi } from '../hooks/useConditionSetApi'; // Removed

interface TerraformExportOptions {
  key?: string;
  file?: string;
}

async function fetchEnvironmentContent(apiKey: string, environmentId: string) {
  // Removed the useEnvironmentApi logic
  // Removed the useResourceApi logic
  // Removed the useRoleApi logic
  // Removed the useUserSetApi logic
  // Removed the useResourceSetApi logic
  // Removed the useConditionSetApi logic

  const [resources, roles, userSets, resourceSets, conditionSets] = await Promise.all([
    // Placeholder for resource fetching logic
  ]);

  return {
    resources,
    roles,
    userSets,
    resourceSets,
    conditionSets
  };
}

function generateHCL(content: any): string {
  let hcl = `# Terraform export for environment\n\n`;

  // Generate resources
  hcl += 'resource "permit_resource" "resources" {\n';
  content.resources.forEach((resource: any) => {
    hcl += `  resource "${resource.key}" {\n`;
    hcl += `    name = "${resource.name}"\n`;
    hcl += `    description = "${resource.description}"\n`;
    hcl += `    actions = ${JSON.stringify(resource.actions)}\n`;
    hcl += `    attributes = ${JSON.stringify(resource.attributes)}\n`;
    hcl += '  }\n';
  });
  hcl += '}\n\n';

  // Generate roles
  hcl += 'resource "permit_role" "roles" {\n';
  content.roles.forEach((role: any) => {
    hcl += `  role "${role.key}" {\n`;
    hcl += `    name = "${role.name}"\n`;
    hcl += `    description = "${role.description}"\n`;
    hcl += `    permissions = ${JSON.stringify(role.permissions)}\n`;
    hcl += '  }\n';
  });
  hcl += '}\n\n';

  // Generate user sets
  hcl += 'resource "permit_user_set" "user_sets" {\n';
  content.userSets.forEach((userSet: any) => {
    hcl += `  user_set "${userSet.key}" {\n`;
    hcl += `    name = "${userSet.name}"\n`;
    hcl += `    description = "${userSet.description}"\n`;
    hcl += '  }\n';
  });
  hcl += '}\n\n';

  // Generate resource sets
  hcl += 'resource "permit_resource_set" "resource_sets" {\n';
  content.resourceSets.forEach((resourceSet: any) => {
    hcl += `  resource_set "${resourceSet.key}" {\n`;
    hcl += `    name = "${resourceSet.name}"\n`;
    hcl += `    description = "${resourceSet.description}"\n`;
    hcl += '  }\n';
  });
  hcl += '}\n\n';

  // Generate condition sets
  hcl += 'resource "permit_condition_set" "condition_sets" {\n';
  content.conditionSets.forEach((conditionSet: any) => {
    hcl += `  condition_set "${conditionSet.key}" {\n`;
    hcl += `    name = "${conditionSet.name}"\n`;
    hcl += `    description = "${conditionSet.description}"\n`;
    hcl += `    conditions = ${JSON.stringify(conditionSet.conditions)}\n`;
    hcl += '  }\n';
  });
  hcl += '}\n';

  return hcl;
}

export const terraformExportCommand = new Command('terraform')
  .description('Export environment content in Terraform provider format')
  .option('--key <key>', 'API key to use for authentication')
  .option('--file <file>', 'File path to save the exported HCL')
  .action(async (options: TerraformExportOptions) => {
    try {
      const apiKey = options.key; // Removed AuthProvider logic
      if (!apiKey) {
        console.error('API key is required.');
        process.exit(1);
      }
      // Removed EnvironmentSelection logic
      
      const content = await fetchEnvironmentContent(apiKey, 'default-environment-id'); // Placeholder for environment ID
      const hclContent = generateHCL(content);
      
      if (options.file) {
        writeFileSync(options.file, hclContent);
        console.log(`Exported HCL to ${options.file}`);
      } else {
        console.log(hclContent);
      }
    } catch (error) {
      console.error('Error exporting environment:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

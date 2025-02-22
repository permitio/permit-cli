import React from 'react';
import { Text } from 'ink';
import zod from 'zod';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';

// Define command arguments schema
export const args = zod.tuple([]);

// Define command options schema
export const options = zod.object({
  key: zod.string().optional().describe('Permit API key'),
  file: zod.string().optional().describe('Output file path for HCL'),
  projectId: zod.string().describe('Project ID'),
  environmentId: zod.string().describe('Environment ID'),
});

type Props = {
  args: zod.infer<typeof args>;
  options: zod.infer<typeof options>;
};

export default function EnvExportTerraform({ options }: Props) {
  const { getEnvironment } = useEnvironmentApi();
  
  const fetchEnvironment = async () => {
    const { projectId, environmentId, key } = options;
    if (!key) {
      console.error('API key is required.');
      return;
    }
    const environment = await getEnvironment(projectId, environmentId, key);
    console.log(environment); // Placeholder for actual logic
  };

  // Call fetchEnvironment to utilize the function
  fetchEnvironment();

  return (
    <Text>
      <Text color="green">Terraform export command</Text>
    </Text>
  );
}

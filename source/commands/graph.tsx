import { Command } from 'commander';
import { fetchResources, fetchRelationships, fetchRoleAssignments } from '../lib/api.ts';
import { createGraph } from '../utils/graphUtils.ts';

const program = new Command();

program
  .command('fga graph')
  .description('Show the graph of the Permit permissions in ReBAC')
  .action(async () => {
    const getToken = async () => {
        return process.env['PERMIT_API_TOKEN'] || 'your_default_token'; // Use bracket notation to access the environment variable
    };
    const token = await getToken();
    try {
      const resourcesResponse = await fetchResources(token);
      const relationshipsResponse = await fetchRelationships(token);
      const roleAssignmentsResponse = await fetchRoleAssignments(token);

      const graphData = createGraph(
        resourcesResponse.response, 
        relationshipsResponse.response, 
        roleAssignmentsResponse.response
      );

      // Output the graph data in a user-friendly format
      console.log('Graph Data:', JSON.stringify(graphData, null, 2)); // Pretty print the graph data
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  });

export default program;

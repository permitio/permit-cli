import { fetchResourceInstances, fetchRelationships, fetchRoleAssignments } from '../lib/api.js';

type Node = {
  id: string;
  label: string;
  type: string;
};

type Link = {
  source: string;
  target: string;
  relationship: string;
};

type GraphData = {
  nodes: Node[];
  links: Link[];
};
export const buildGraphData = async (
  projId: string,
  envId: string,
  token: string
): Promise<GraphData> => {
  try {
    // Fetch resource instances
    const resourceResponse = await fetchResourceInstances(projId, envId, token);
    if (resourceResponse.status === 404) {
      console.warn(`No resources found for project ${projId} and environment ${envId}. Response:`, resourceResponse.response);
    }
    const resources = Array.isArray(resourceResponse.response) ? resourceResponse.response : [];

    const nodes: Node[] = [];
    const links: Link[] = [];

    // Process resources if any exist
    resources.forEach((resource: any) => {
      nodes.push({
        id: resource.id,
        label: resource.key || resource.id,
        type: 'resource',
      });
    });

    // Fetch and process relationships only if resources were found
    for (const resource of resources) {
      const relationshipsResponse = await fetchRelationships(projId, envId, resource.id, token);
      if (relationshipsResponse.status === 404) {
        console.warn(`No relationships found for resource ${resource.id}.`);
      }
      const relationships = Array.isArray(relationshipsResponse.response) ? relationshipsResponse.response : [];
      relationships.forEach((rel: any) => {
        links.push({
          source: resource.id,
          target: rel.target_id,
          relationship: rel.type || 'relation',
        });
      });
    }

    // Fetch and process role assignments
    const roleAssignmentsResponse = await fetchRoleAssignments(projId, envId, token);
    if (roleAssignmentsResponse.status === 404) {
      console.warn(`No role assignments found for project ${projId} and environment ${envId}.`);
    }
    const roleAssignments = Array.isArray(roleAssignmentsResponse.response) ? roleAssignmentsResponse.response : [];
    roleAssignments.forEach((role: any) => {
      nodes.push({
        id: role.user_id,
        label: role.role,
        type: 'user',
      });
      links.push({
        source: role.user_id,
        target: role.resource_instance,
        relationship: 'assigned_role',
      });
    });

    return { nodes, links };
  } catch (error) {
    console.error("Error building graph data:", error);
    throw new Error(`Failed to build graph data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

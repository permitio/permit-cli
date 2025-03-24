import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';
import { generateGraphData } from '../components/GraphDataGenerator.js';

interface APIRelationship {
	subject: string;
	relation: string;
	object: string;
}

type RoleAssignment = {
	user: string;
	email: string;
	role: string;
	resourceInstance: string;
};

type Relationship = {
	label: string;
	id: string;
	subjectId: string;
	objectId: string;
	Object: string;
};

interface APIResourceInstanceRole {
	resource_instance: string;
	resource: string;
	role: string;
}

interface APITenant {
	tenant: string;
	roles: string[];
	status: string;
	resource_instance_roles?: APIResourceInstanceRole[];
}

interface APIUser {
	key: string;
	email?: string;
	associated_tenants?: APITenant[];
}

export const useGraphDataApi = () => {
	const { authenticatedApiClient } = useClient();

	const fetchGraphData = useCallback(
		async (projectId: string, environmentId: string) => {
			const perPage = 100;
			let currentPage = 1;
			let hasMoreData = true;
			let allResourcesData: {
				label: string;
				value: string;
				id: string;
				id2: string;
				key: string;
				relationships?: APIRelationship[];
			}[] = [];
			let allRoleAssignmentsData: RoleAssignment[] = [];
			const relationsMap = new Map<string, Relationship[]>();

			try {
				// Fetch resource instances with pagination
while (hasMoreData) {
	const resourceResult = await authenticatedApiClient().GET(
		`/v2/facts/{proj_id}/{env_id}/resource_instances/detailed`,
		{ proj_id: projectId, env_id: environmentId },
		undefined,
		{ page: currentPage, per_page: perPage }
	);

	if (resourceResult.error) {
		throw new Error(resourceResult.error);
	}

	const resourceArray: any[] = Array.isArray(resourceResult.data)
		? resourceResult.data
		: resourceResult.data?.data || [];


	const resourcesData = resourceArray.map(
		(res: {
			resource: string;
			resource_id: string;
			id: string;
			key: string;
			relationships?: APIRelationship[];
		}) => ({
			label: `${res.resource}#${res.resource_id}`,
			value: res.id,
			id: res.id,
			id2: `${res.resource}:${res.key}`,
			key: res.key,
			relationships: res.relationships || [],
		})
	);


	allResourcesData = [...allResourcesData, ...resourcesData];
	hasMoreData = resourceArray.length === perPage;
	currentPage++;
}

// Build a lookup map from each resource's id2 to its id
const id2ToLabelMap = new Map<string, string>();
allResourcesData.forEach((resource) => {
	id2ToLabelMap.set(resource.id2, resource.id);
});

// Map each resource's relationships using the lookup map
allResourcesData.forEach((resource) => {
	const relationsData: APIRelationship[] = resource.relationships || [];

	const mappedRelationships: Relationship[] = relationsData.map((relation: APIRelationship): Relationship => {
		const matchedLabel = id2ToLabelMap.get(relation.object);
		const matchedSubjectId = id2ToLabelMap.get(relation.subject);
		const relationLabel = relation.relation ? relation.relation.toUpperCase() : 'UNKNOWN RELATION';
		return {
			label: relationLabel,
			objectId: matchedLabel || relation.object,
			Object: relation.object,
			subjectId: matchedSubjectId || relation.subject,
			id: resource.id,
		};
	});
	relationsMap.set(resource.id, mappedRelationships);
});


				// Reset pagination for user roles
				currentPage = 1;
				hasMoreData = true;

				// Fetch user data with role assignments with pagination
				// Fetch user data with role assignments with pagination
while (hasMoreData) {

	// IMPORTANT: Pass the path values separately and the query parameters in the fourth parameter.
	const roleResult = await authenticatedApiClient().GET(
		`/v2/facts/{proj_id}/{env_id}/users`,
		{ proj_id: projectId, env_id: environmentId },
		undefined,
		{ include_resource_instance_roles: true, page: currentPage, per_page: perPage }
	);

	if (roleResult.error) {
		throw new Error(roleResult.error);
	}

	// Extract users from the response
	const users: APIUser[] = Array.isArray(roleResult.data)
		? roleResult.data
		: roleResult.data?.data || [];

	// Process each user
	users.forEach((user) => {
		const username = user.key;
		const email = user.email;

		// Check if the user has associated tenants
		if (user.associated_tenants?.length) {
			user.associated_tenants.forEach((tenant) => {
				if (tenant.resource_instance_roles?.length) {
					tenant.resource_instance_roles.forEach((resourceInstanceRole: APIResourceInstanceRole) => {
						const lookupKey = `${resourceInstanceRole.resource}:${resourceInstanceRole.resource_instance}`;
						const resourceInstanceId = id2ToLabelMap.get(lookupKey) || resourceInstanceRole.resource_instance;
						allRoleAssignmentsData.push({
							user: username || 'Unknown User found',
							email: email || '',
							role: resourceInstanceRole.role || 'Unknown Role',
							resourceInstance: resourceInstanceId || 'Unknown Resource Instance',
						});
					});
				} else {
					allRoleAssignmentsData.push({
						user: username || 'Unknown User',
						email: email || '',
						role: 'No Role Assigned',
						resourceInstance: 'No Resource Instance',
					});
				}
			});
		} else {
			console.log(`User ${username} has no associated tenants.`);
			allRoleAssignmentsData.push({
				user: username || 'Unknown User',
				email: email || '',
				role: 'No Role Assigned',
				resourceInstance: 'No Resource Instance',
			});
		}
	});

	// Determine if there are more pages to fetch (using the length of the returned array)
	const userArray: any[] = Array.isArray(roleResult.data)
		? roleResult.data
		: roleResult.data?.data || [];
	hasMoreData = userArray.length === perPage;
	currentPage++;
}


				// Generate graph data
				const graphData = generateGraphData(allResourcesData, relationsMap, allRoleAssignmentsData);
				const updatedGraphData = {
					...graphData,
					edges: graphData.edges.map((edge: any) => ({
						...edge,
						classes: edge.classes || '',
					})),
				};

				return { data: updatedGraphData, error: null };
			} catch (err) {
				console.error('Error fetching graph data:', err);
				return { data: null, error: 'Failed to fetch data. Check network or auth token.' };
			}
		},
		[authenticatedApiClient]
	);

	return useMemo(() => ({ fetchGraphData }), [fetchGraphData]);
};

export default useGraphDataApi;

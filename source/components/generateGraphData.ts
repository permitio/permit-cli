// Define types
type ResourceInstance = {
	label: string;
	value: string;
	id: string;
};

type Relationship = {
	label: string;
	value: string;
};

type RoleAssignment = {
	user: string;
	role: string;
	resourceInstance: string;
};

// Generate Graph Data
export const generateGraphData = (
	resources: ResourceInstance[],
	relationships: Map<string, Relationship[]>,
	roleAssignments: RoleAssignment[],
) => {
	const nodes = resources.map(resource => ({
		data: { id: resource.id, label: `Resource: ${resource.label}` },
	}));

	const edges: { data: { source: string; target: string; label: string } }[] =
		[];
	const existingNodeIds = new Set(nodes.map(node => node.data.id));

	relationships.forEach((relations, resourceId) => {
		relations.forEach(relation => {
			if (!existingNodeIds.has(relation.value)) {
				nodes.push({
					data: { id: relation.value, label: `Resource: ${relation.value}` },
				});
				existingNodeIds.add(relation.value);
			}

			edges.push({
				data: {
					source: resourceId,
					target: relation.value,
					label: relation.label,
				},
			});
		});
	});

	// Add role assignments to the graph
	roleAssignments.forEach(assignment => {
		// Add user nodes
		if (!existingNodeIds.has(assignment.user)) {
			nodes.push({
				data: { id: assignment.user, label: `User: ${assignment.user}` },
			});
			existingNodeIds.add(assignment.user);
		}

		// Add role nodes
		const roleNodeId = `role:${assignment.role}`;
		if (!existingNodeIds.has(roleNodeId)) {
			nodes.push({
				data: { id: roleNodeId, label: `Role: ${assignment.role}` },
			});
			existingNodeIds.add(roleNodeId);
		}

		// Connect user to role
		edges.push({
			data: {
				source: assignment.user,
				target: roleNodeId,
				label: `Assigned role`,
			},
		});

		// Connect role to resource instance
		edges.push({
			data: {
				source: roleNodeId,
				target: assignment.resourceInstance,
				label: `Grants access`,
			},
		});
	});

	return { nodes, edges };
};

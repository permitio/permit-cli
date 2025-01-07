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
	const nodes: { data: { id: string; label: string }; classes?: string }[] =
		resources.map(resource => ({
			data: { id: resource.id, label: ` ${resource.label}` },
			classes: 'resource-instance-node',
		}));

	const edges: {
		data: { source: string; target: string; label: string };
		classes?: string;
	}[] = [];
	const existingNodeIds = new Set(nodes.map(node => node.data.id));

	relationships.forEach((relations, resourceId) => {
		relations.forEach(relation => {
			if (!existingNodeIds.has(relation.value)) {
				nodes.push({
					data: { id: relation.value, label: `${relation.value}` },
				});
				existingNodeIds.add(relation.value);
			}

			edges.push({
				data: {
					source: resourceId,
					target: relation.value,
					label: relation.label,
				},
				classes: 'relationship-connection', // Class for orange lines
			});
		});
	});

	// add role assignments to the graph
	roleAssignments.forEach(assignment => {
		// Add user nodes with a specific class
		if (!existingNodeIds.has(assignment.user)) {
			nodes.push({
				data: { id: assignment.user, label: `${assignment.user}` },
				classes: 'user-node',
			});
			existingNodeIds.add(assignment.user);
		}

		// Connect user to resource instance
		edges.push({
			data: {
				source: assignment.user,
				target: assignment.resourceInstance,
				label: `${assignment.role}`,
			},
		});
	});

	// Infer implicit assignments and add them as dashed green lines
	const implicitAssignments: { user: string; resourceInstance: string }[] = [];
	relationships.forEach((relations, sourceId) => {
		const directlyAssignedUsers = roleAssignments
			.filter(assignment => assignment.resourceInstance === sourceId)
			.map(assignment => assignment.user);

		relations.forEach(relation => {
			directlyAssignedUsers.forEach(user => {
				implicitAssignments.push({
					user, // The user indirectly assigned
					resourceInstance: relation.value, // Target resource instance
				});
			});
		});
	});

	implicitAssignments.forEach(assignment => {
		edges.push({
			data: {
				source: assignment.user,
				target: assignment.resourceInstance,
				label: 'DERIVES', // Label for dashed green lines
			},
			classes: 'implicit-role-connection', // Class for styling dashed green lines
		});
	});
	return { nodes, edges };
};

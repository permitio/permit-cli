// Define types
type ResourceInstance = {
	label: string;
	value: string;
	id: string;
	id2: string;
};

type Relationship = {
	label: string;
	objectId: string;
	id: string;
	subjectId: string;
	Object: string;
};

type RoleAssignment = {
	user: string;
	email: string;
	role: string;
	resourceInstance: string;
};

const ResourceInstanceClass = 'resource-instance-node';

// Generate Graph Data
export const generateGraphData = (
	resources: ResourceInstance[],
	relationships: Map<string, Relationship[]>,
	roleAssignments: RoleAssignment[],
) => {
	const nodes: { data: { id: string; label: string }; classes?: string }[] =
		resources.map(resource => ({
			data: { id: resource.id, label: ` ${resource.label}`, id2: resource.id2 },
			classes: ResourceInstanceClass,
		}));

	const edges: {
		data: { source: string; target: string; label: string };
		classes?: string;
	}[] = [];
	const existingNodeIds = new Set(nodes.map(node => node.data.id));

	relationships.forEach((relations, resourceId) => {
		relations.forEach(relation => {
			if (!existingNodeIds.has(relation.Object)) {
				nodes.push({
					data: { id: relation.Object, label: `${relation.Object}` },
					classes: 'object-node',
				});
				existingNodeIds.add(relation.Object);
			}

			if (resourceId !== relation.Object) {
				// Check if an edge with the same source, target, and label already exists.
				const exists = edges.some(
					edge =>
						edge.data.source === resourceId &&
						edge.data.target === relation.Object &&
						edge.data.label === `IS ${relation.label} OF`,
				);
				if (!exists) {
					edges.push({
						data: {
							source: resourceId,
							target: relation.Object,
							label: `IS ${relation.label} OF`,
						},
						classes: 'relationship-connection',
					});
				}
			}
		});
	});
	relationships.forEach(relations => {
		relations.forEach(relation => {
			if (!existingNodeIds.has(relation.id)) {
				nodes.push({
					data: { id: relation.objectId, label: `${relation.objectId}` },
				});
				existingNodeIds.add(relation.objectId);
			}

			if (!existingNodeIds.has(relation.objectId)) {
				nodes.push({
					data: { id: relation.objectId, label: `${relation.objectId}` },
				});
				existingNodeIds.add(relation.objectId);
			}

			if (relation.subjectId !== relation.objectId) {
				// Check if an edge with the same source, target, and label already exists.
				const exists = edges.some(
					edge =>
						edge.data.source === relation.subjectId &&
						edge.data.target === relation.objectId &&
						edge.data.label === relation.label,
				);
				if (!exists) {
					edges.push({
						data: {
							source: relation.subjectId,
							target: relation.objectId,
							label: relation.label,
						},
						classes: 'relationship-connection', // Class for orange lines
					});
				}
			}
		});
	});

	// add role assignments to the graph
	roleAssignments.forEach(assignment => {
		// Add user nodes with a specific class
		if (!existingNodeIds.has(assignment.user)) {
			nodes.push({
				data: {
					id: assignment.user,
					label: `${assignment.user} ${assignment.email}`,
				},
				classes: 'user-node',
			});
			existingNodeIds.add(assignment.user);
		}

		if (assignment.resourceInstance !== 'No Resource Instance') {
			if (!existingNodeIds.has(assignment.resourceInstance)) {
				nodes.push({
					data: {
						id: assignment.resourceInstance,
						label: `${assignment.resourceInstance}`,
					},
					classes: ResourceInstanceClass,
				});
				existingNodeIds.add(assignment.resourceInstance);
			}
		}
		// Connect user to resource instance

		if (assignment.role !== 'No Role Assigned') {
			edges.push({
				data: {
					source: assignment.user,
					target: assignment.resourceInstance,
					label: `${assignment.role}`,
				},
				classes: 'user-edge',
			});
		}
	});

	// Ensure that for every target ID in the edges array there is a corresponding node
	edges.forEach(edge => {
		if (!existingNodeIds.has(edge.data.target)) {
			nodes.push({
				data: {
					id: edge.data.target,
					label: `Node ${edge.data.target}`,
				},
				classes: ResourceInstanceClass,
			});
			existingNodeIds.add(edge.data.target);
		}
	});

	return { nodes, edges };
};

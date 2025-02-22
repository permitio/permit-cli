interface Resource {
    id: string;
    name: string;
}

interface Relationship {
    sourceId: string;
    targetId: string;
    type: string;
}

interface RoleAssignment {
    // Define the structure based on actual role assignment data
    userId: string;
    roleId: string;
}

export const createGraph = (resources: Resource[], relationships: Relationship[], roleAssignments: RoleAssignment[]) => {
    const graph = {
        nodes: resources.map(resource => ({ id: resource.id, label: resource.name })),
        edges: relationships.map(rel => ({
            from: rel.sourceId,
            to: rel.targetId,
            label: rel.type,
        })),
        roleAssignments: roleAssignments,
    };

    return graph;
};

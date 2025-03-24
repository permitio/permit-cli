import { describe, it, expect } from 'vitest';
import { generateGraphData } from '../../source/components/GraphDataGenerator'; 

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

describe('generateGraphData', () => {
	it('should create resource nodes without edges when no relationships or role assignments exist', () => {
		const resources: ResourceInstance[] = [
			{ label: 'Resource 1', value: 'val1', id: 'r1', id2: 'r1-2' },
		];
		const relationships = new Map<string, Relationship[]>();
		const roleAssignments: RoleAssignment[] = [];

		const { nodes, edges } = generateGraphData(resources, relationships, roleAssignments);

		// Check that the resource node exists with the right class
		expect(nodes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { id: 'r1', label: ' Resource 1', id2: 'r1-2' },
					classes: 'resource-instance-node',
				}),
			]),
		);
		expect(edges).toHaveLength(0);
	});

	it('should create object nodes and relationship edges from relationships', () => {
		const resources: ResourceInstance[] = [
			{ label: 'Resource 1', value: 'val1', id: 'r1', id2: 'r1-2' },
		];
		// Create a relationship from resource "r1" to object "obj1"
		const relationship: Relationship = {
			label: 'RELATES',
			objectId: 'obj1',
			id: 'rel1',
			subjectId: 'r1',
			Object: 'obj1',
		};
		const relationships = new Map<string, Relationship[]>();
		relationships.set('r1', [relationship]);
		const roleAssignments: RoleAssignment[] = [];

		const { nodes, edges } = generateGraphData(resources, relationships, roleAssignments);

		// Verify resource node exists
		expect(nodes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { id: 'r1', label: ' Resource 1', id2: 'r1-2' },
					classes: 'resource-instance-node',
				}),
			]),
		);

		// Verify object node created by relationship (should have class 'object-node')
		expect(nodes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { id: 'obj1', label: 'obj1' },
					classes: 'object-node',
				}),
			]),
		);

		// Verify relationship edge is created with the correct label
		expect(edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { source: 'r1', target: 'obj1', label: 'IS RELATES OF' },
					classes: 'relationship-connection',
				}),
			]),
		);
	});

	it('should create user nodes and user edges from role assignments', () => {
		const resources: ResourceInstance[] = [
			{ label: 'Resource 1', value: 'val1', id: 'r1', id2: 'r1-2' },
		];
		const relationships = new Map<string, Relationship[]>();
		// Role assignment linking a user to resource "r1"
		const roleAssignments: RoleAssignment[] = [
			{
				user: 'u1',
				email: 'u1@example.com',
				role: 'admin',
				resourceInstance: 'r1',
			},
		];

		const { nodes, edges } = generateGraphData(resources, relationships, roleAssignments);

		// Check that a user node is created with class 'user-node'
		expect(nodes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { id: 'u1', label: 'u1 u1@example.com' },
					classes: 'user-node',
				}),
			]),
		);

		// Check that an edge is created connecting the user to the resource instance with label "admin"
		expect(edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: { source: 'u1', target: 'r1', label: 'admin' },
					classes: 'user-edge',
				}),
			]),
		);
	});

	it('should not duplicate nodes or edges for duplicate relationships or role assignments', () => {
        const resources: ResourceInstance[] = [
            { label: 'Resource 1', value: 'val1', id: 'r1', id2: 'r1-2' },
        ];
        // Duplicate relationship entries for the same connection
        const relationship: Relationship = {
            label: 'ASSOCIATED',
            objectId: 'obj1',
            id: 'rel1',
            subjectId: 'r1',
            Object: 'obj1',
        };
        const relationships = new Map<string, Relationship[]>();
        relationships.set('r1', [relationship, relationship]);
        const roleAssignments: RoleAssignment[] = [
            {
                user: 'u1',
                email: 'u1@example.com',
                role: 'admin',
                resourceInstance: 'r1',
            },
            {
                user: 'u1',
                email: 'u1@example.com',
                role: 'admin',
                resourceInstance: 'r1',
            },
        ];
    
        const { nodes, edges } = generateGraphData(resources, relationships, roleAssignments);
    
        expect(nodes.length).toBe(5);
    
        const relEdges = edges.filter(
            (edge) =>
                edge.classes === 'relationship-connection' &&
                edge.data.source === 'r1' &&
                edge.data.target === 'obj1' &&
                edge.data.label === 'IS ASSOCIATED OF',
        );
        expect(relEdges.length).toBe(1);
    
        const userEdges = edges.filter(
            (edge) =>
                edge.classes === 'user-edge' &&
                edge.data.source === 'u1' &&
                edge.data.target === 'r1' &&
                edge.data.label === 'admin',
        );
        expect(userEdges.length).toBe(2);
    });    
});

import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { type infer as zInfer, object, string } from 'zod';
import { apiCall } from '../lib/api.js';
import { option } from 'pastel';
import {loadAuthToken} from '../lib/auth.js';

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
    label: string;
    value: string;
};

// Define options schema
export const options = object({
    projId: string().describe(
        option({
            description: 'Project ID for Permit API',
            alias: 'p',
        })
    ),
    envId: string().describe(
        option({
            description: 'Environment ID for Permit API',
            alias: 'e',
        })
    ),
});

type Props = {
    readonly options: zInfer<typeof options>;
};

export default function Graph({ options: { projId, envId } }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resources, setResources] = useState<ResourceInstance[]>([]);
    const [relationships, setRelationships] = useState<Map<string, Relationship[]>>(new Map());
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [selectedResourceID, setSelectedResourceID] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await loadAuthToken(); // 'your_token_here'
                if (!token) {
                    setError('No auth token found. Please log in with permit login.');
                    return;
                }
    
                // Fetch resource instances with relationships
                const { response: resourceInstances } = await apiCall(
                    `v2/facts/${projId}/${envId}/resource_instances?detailed=true`,
                    token
                );
    
                const resourcesData = resourceInstances.map((res: any) => ({
                    label: res.resource,
                    value: res.id,
                    id: res.id,
                }));
    
                setResources(resourcesData);
    
                // Build relationships map
                const relationsMap = new Map<string, Relationship[]>();
                resourceInstances.forEach((resource: any) => {
                    const relationsData = resource.relationships || [];
                    relationsMap.set(
                        resource.id,
                        relationsData.map((relation: any) => ({
                            label: `${relation.relation} → ${relation.object}`,
                            value: relation.object || 'Unknown ID',
                        }))
                    );
                });
    
                setRelationships(relationsMap);
    
                // Fetch role assignments
                const { response: roleAssignmentsData } = await apiCall(
                    `v2/facts/${projId}/${envId}/role_assignments`,
                    token
                );
                setRoleAssignments(
                    roleAssignmentsData.map((role: any) => ({
                        label: role.role,
                        value: role.id,
                    }))
                );
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to fetch data. Check network or auth token.');
            } finally {
                setLoading(false);
            }
        };
    
        fetchData();
    }, [projId, envId]);
    

    if (loading) {
        return (
            <Text>
                <Spinner type="dots" /> Loading Permit Graph...
            </Text>
        );
    }

    if (error) {
        return <Text color="red">{error}</Text>;
    }

    const handleSelect = (item: { value: string }) => {
        setSelectedResourceID(item.value);
    };

    const renderRelationships = (selectedID: string) => {
        const relationshipsForResource = relationships.get(selectedID);
        if (!relationshipsForResource || relationshipsForResource.length === 0) {
            return <Text>No relationships found for this resource.</Text>;
        }
    
        return relationshipsForResource.map((relationship) => (
            <Text key={relationship.value}>➔ {relationship.label}</Text>
        ));
    };    

    const renderGraph = () => {
        return resources.map((resource) => (
            <Box key={resource.value}>
                <Text color="cyan">{resource.label}</Text>
                {relationships.get(resource.id)?.map((relationship) => (
                    <Text key={relationship.value}> ➔ {relationship.label}</Text>
                ))}
            </Box>
        ));
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Text color="cyan">Resource Instances:</Text>
            <SelectInput
                items={resources.map((resource) => ({ label: resource.label, value: resource.id }))}
                onSelect={handleSelect}
            />

            {selectedResourceID && (
                <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
                    <Text color="yellow">Relationships for Selected Resource:</Text>
                    {renderRelationships(selectedResourceID)}
                </Box>
            )}

            <Text color="cyan">Role Assignments:</Text>
            <Box flexDirection="column" marginBottom={1}>
                {roleAssignments.map((role) => (
                    <Text key={role.value} color="magenta">
                        {role.label}
                    </Text>
                ))}
            </Box>

            <Text color="green">Resource Graph:</Text>
            {renderGraph()}
        </Box>
    );
}

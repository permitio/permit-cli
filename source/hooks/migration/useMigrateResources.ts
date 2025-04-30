import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import {
	MigrationStats,
	Resource,
	ResourceAction,
	ResourceAttribute,
	ConflictStrategy,
} from './types.js';

const useMigrateResources = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();

	/**
	 * Clean up resource actions by removing metadata fields not accepted by the API
	 */
	const cleanResourceData = (resource: Resource) => {
		const cleanedResource: Record<string, any> = {
			key: resource.key,
			name: resource.name || resource.key,
			description: resource.description || '',
			actions: {} as Record<string, ResourceAction>,
			attributes: {} as Record<string, ResourceAttribute>,
		};

		if (resource.actions) {
			Object.keys(resource.actions).forEach(actionKey => {
				const action = resource.actions?.[actionKey];
				if (action) {
					cleanedResource.actions[actionKey] = {
						name: action.name,
						description: action.description || '',
					};
				}
			});
		}

		if (resource.attributes) {
			Object.keys(resource.attributes).forEach(attrKey => {
				const attr = resource.attributes?.[attrKey];
				if (attr) {
					cleanedResource.attributes[attrKey] = {
						type: attr.type,
					};
					if (attr.description) {
						cleanedResource.attributes[attrKey].description = attr.description;
					}
				}
			});
		}

		return cleanedResource;
	};

	const migrateResources = useCallback(
		async (
			sourceEnvId: string,
			targetEnvId: string,
			conflictStrategy: ConflictStrategy = 'override',
		): Promise<MigrationStats> => {
			const stats: MigrationStats = {
				total: 0,
				success: 0,
				failed: 0,
				details: [],
			};

			try {
				if (!scope.project_id) {
					throw new Error('Project ID is not available in the current scope');
				}

				// Get resources from source environment
				const { data: sourceResourcesResponse, error: sourceResourcesError } =
					await authenticatedApiClient().GET(
						`/v2/schema/{proj_id}/{env_id}/resources`,
						{
							proj_id: scope.project_id,
							env_id: sourceEnvId,
						},
					);

				if (sourceResourcesError) {
					stats.details?.push(
						`Error getting resources: ${sourceResourcesError}`,
					);
					return stats;
				}

				if (!sourceResourcesResponse) {
					stats.details?.push('No resources found in source environment');
					return stats;
				}

				// Handle different response formats
				const sourceResources = Array.isArray(sourceResourcesResponse)
					? sourceResourcesResponse
					: sourceResourcesResponse &&
						  typeof sourceResourcesResponse === 'object' &&
						  'data' in sourceResourcesResponse &&
						  Array.isArray(sourceResourcesResponse.data)
						? sourceResourcesResponse.data
						: [];

				// Get resources from target environment
				const { data: targetResourcesResponse } =
					await authenticatedApiClient().GET(
						`/v2/schema/{proj_id}/{env_id}/resources`,
						{
							proj_id: scope.project_id,
							env_id: targetEnvId,
						},
					);

				// Handle different response formats
				const targetResources = targetResourcesResponse
					? Array.isArray(targetResourcesResponse)
						? targetResourcesResponse
						: targetResourcesResponse &&
							  typeof targetResourcesResponse === 'object' &&
							  'data' in targetResourcesResponse &&
							  Array.isArray(targetResourcesResponse.data)
							? targetResourcesResponse.data
							: []
					: [];

				// Create a map of existing resource keys in target
				const targetResourceKeys = new Set(
					targetResources.map(resource => resource?.key).filter(Boolean),
				);

				stats.total = sourceResources.length;

				// Create or update each resource
				for (let i = 0; i < sourceResources.length; i++) {
					const resource = sourceResources[i];

					try {
						if (!resource?.key) {
							stats.failed++;
							continue;
						}

						// Clean up the resource data to remove fields not accepted by the API
						const resourceData = cleanResourceData(resource);

						// Check if resource already exists in target
						if (targetResourceKeys.has(resource.key)) {
							if (conflictStrategy === 'override') {
								try {
									// Use PUT for updating resources
									const updateResult = await authenticatedApiClient().PUT(
										`/v2/schema/{proj_id}/{env_id}/resources/{resource_id}`,
										{
											proj_id: scope.project_id,
											env_id: targetEnvId,
											resource_id: resource.key,
										},
										resourceData,
										undefined,
									);

									if (updateResult.error) {
										stats.failed++;
										stats.details?.push(
											`Failed to update resource ${resource.key}: ${updateResult.error}`,
										);
									} else {
										stats.success++;
									}
								} catch (error) {
									stats.failed++;
									stats.details?.push(
										`Error updating resource ${resource.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
									);
								}
							} else {
								stats.failed++;
								stats.details?.push(
									`Resource ${resource.key} already exists (conflict=fail)`,
								);
							}
						} else {
							// Create the resource
							try {
								const createResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/resources`,
									{
										proj_id: scope.project_id,
										env_id: targetEnvId,
									},
									resourceData,
									undefined,
								);

								if (createResult.error) {
									stats.failed++;
									stats.details?.push(
										`Failed to create resource ${resource.key}: ${createResult.error}`,
									);
								} else {
									stats.success++;
									targetResourceKeys.add(resource.key);
								}
							} catch (error) {
								stats.failed++;
								stats.details?.push(
									`Error creating resource ${resource.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
								);
							}
						}
					} catch (resourceError) {
						stats.failed++;
						stats.details?.push(
							`Error processing resource: ${resourceError instanceof Error ? resourceError.message : 'Unknown error'}`,
						);
					}
				}

				return stats;
			} catch (err) {
				stats.details?.push(
					`Resource migration error: ${err instanceof Error ? err.message : 'Unknown error'}`,
				);
				return stats;
			}
		},
		[authenticatedApiClient, scope.project_id],
	);

	return { migrateResources };
};

export default useMigrateResources;

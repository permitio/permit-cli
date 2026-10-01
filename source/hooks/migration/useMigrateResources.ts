import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, ConflictStrategy } from './types.js';
import { components } from '../../lib/api/v1.js';

type ResourceRead = components['schemas']['ResourceRead'];
type ResourceCreate = components['schemas']['ResourceCreate'];
type ResourceUpdatePayload = components['schemas']['ResourceUpdate'];
type ActionBlockEditable = components['schemas']['ActionBlockEditable'];
type AttributeBlockEditable = components['schemas']['AttributeBlockEditable'];
type RelationBlockRead = components['schemas']['RelationBlockRead'];

const useMigrateResources = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();

	const migrateResources = useCallback(
		async (
			sourceEnvId: string,
			targetEnvId: string,
			conflictStrategy: ConflictStrategy = 'override',
		): Promise<MigrationStats> => {
			const cleanResourceDataForUpdate = (
				resource: ResourceRead,
			): ResourceUpdatePayload => {
				const cleaned: ResourceUpdatePayload = {
					name: resource.name || resource.key || '',
					description: resource.description || '',
					actions: {},
					attributes: {},
					relations: {},
					urn: resource.urn || undefined,
				};

				if (resource.actions) {
					for (const actionKey in resource.actions) {
						const action = resource.actions[actionKey];
						if (action) {
							cleaned.actions![actionKey] = {
								name: action.name || actionKey,
								description: action.description || '',
								attributes: action.attributes,
							};
						}
					}
				}

				if (resource.attributes) {
					for (const attrKey in resource.attributes) {
						const attr = resource.attributes[attrKey];
						if (attr) {
							cleaned.attributes![attrKey] = {
								type: attr.type,
								description: attr.description || '',
							};
						}
					}
				}

				if (resource.relations) {
					for (const relationKey in resource.relations) {
						const relationInfo = resource.relations[relationKey];
						if (relationInfo && relationInfo.resource) {
							cleaned.relations![relationKey] = relationInfo.resource;
						}
					}
				}
				return cleaned;
			};

			const stats: MigrationStats = {
				total: 0,
				success: 0,
				failed: 0,
				details: [],
			};

			try {
				if (!scope.project_id) throw new Error('Project ID missing');

				const { data: sourceResResp, error: sourceErr } =
					await authenticatedApiClient().GET(
						`/v2/schema/{proj_id}/{env_id}/resources`,
						{ env_id: sourceEnvId },
					);

				if (sourceErr) {
					stats.details?.push(`Get source error: ${sourceErr}`);
					return stats;
				}
				if (!sourceResResp) {
					stats.details?.push('No source resources');
					return stats;
				}

				const sourceResources: ReadonlyArray<ResourceRead> = Array.isArray(
					sourceResResp,
				)
					? sourceResResp
					: sourceResResp.data || [];

				const { data: targetResResp } = await authenticatedApiClient().GET(
					`/v2/schema/{proj_id}/{env_id}/resources`,
					{ env_id: targetEnvId },
				);
				const targetResources: ReadonlyArray<ResourceRead> = targetResResp
					? Array.isArray(targetResResp)
						? targetResResp
						: targetResResp.data || []
					: [];
				const targetResourceKeys = new Set(targetResources.map(r => r.key));

				stats.total = sourceResources.length;

				for (const resource of sourceResources) {
					try {
						if (!resource?.key) {
							stats.failed++;
							continue;
						}

						const resourceDataForPatch = cleanResourceDataForUpdate(resource);

						// Construct payload matching ResourceCreate schema for POST call
						const resourceDataForPost: ResourceCreate = {
							key: resource.key,
							name: resource.name || resource.key,
							description: resource.description || undefined,
							urn: resource.urn || undefined,
							actions: Object.entries(resource.actions || {}).reduce(
								(acc, [key, action]) => {
									acc[key] = {
										name: action.name || key,
										description: action.description || '',
										attributes: action.attributes,
									};
									return acc;
								},
								{} as { [key: string]: ActionBlockEditable },
							),

							attributes: Object.entries(resource.attributes || {}).reduce(
								(acc, [key, attr]) => {
									acc[key] = {
										type: attr.type,
										description: attr.description || '',
									};
									return acc;
								},
								{} as { [key: string]: AttributeBlockEditable },
							),

							roles: resource.roles as
								| { [key: string]: components['schemas']['RoleBlockEditable'] }
								| undefined,
							// Map relations: Transform from RelationBlockRead to {[key: string]: string}
							relations: Object.entries(resource.relations || {}).reduce(
								(acc, [key, relationInfo]) => {
									const relInfo = relationInfo as RelationBlockRead;
									if (relInfo && relInfo.resource) {
										acc[key] = relInfo.resource;
									}
									return acc;
								},
								{} as { [key: string]: string },
							),
						};

						if (targetResourceKeys.has(resource.key)) {
							if (conflictStrategy === 'override') {
								try {
									const updateResult = await authenticatedApiClient().PATCH(
										`/v2/schema/{proj_id}/{env_id}/resources/{resource_id}`,
										{ resource_id: resource.key },
										resourceDataForPatch,
										undefined,
									);
									if (updateResult.error) {
										stats.failed++;
										stats.details?.push(`Update error: ${updateResult.error}`);
									} else {
										stats.success++;
									}
								} catch (error) {
									stats.failed++;
									stats.details?.push(`Update exception: ${error}`);
								}
							} else {
								stats.failed++;
								stats.details?.push(`Conflict: ${resource.key}`);
							}
						} else {
							try {
								const createResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/resources`,
									{ env_id: targetEnvId },
									resourceDataForPost,
									undefined,
								);
								if (createResult.error) {
									stats.failed++;
									stats.details?.push(`Create error: ${createResult.error}`);
								} else {
									stats.success++;
									targetResourceKeys.add(resource.key);
								}
							} catch (error) {
								stats.failed++;
								stats.details?.push(`Create exception: ${error}`);
							}
						}
					} catch (resourceError) {
						stats.failed++;
						stats.details?.push(`Processing error: ${resourceError}`);
					}
				}
				return stats;
			} catch (err) {
				stats.details?.push(`Migration error: ${err}`);
				return stats;
			}
		},
		[authenticatedApiClient, scope.project_id],
	);

	return { migrateResources };
};

export default useMigrateResources;

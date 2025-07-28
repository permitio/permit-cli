import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, ConflictStrategy } from './types.js';
import { components } from '../../lib/api/v1.js';

type RoleRead = components['schemas']['RoleRead'];
type RoleCreate = components['schemas']['RoleCreate'];
type RoleUpdatePayload = components['schemas']['RoleUpdate'];

const useMigrateRoles = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();

	const getRoles = useCallback(
		async (
			environmentId: string,
		): Promise<{ roles: RoleRead[]; error: string | null }> => {
			if (!scope.project_id) return { roles: [], error: 'Project ID missing' };
			const rolesEndpoint = `/v2/schema/{proj_id}/{env_id}/roles`;
			try {
				const { data: rolesResponse, error } =
					await authenticatedApiClient().GET(rolesEndpoint, {
						env_id: environmentId,
					});
				if (error) return { roles: [], error };
				if (rolesResponse) {
					const roles = Array.isArray(rolesResponse)
						? rolesResponse
						: rolesResponse.data || [];
					if (roles.length > 0) {
						return { roles: roles as RoleRead[], error: null };
					}
				}
				return { roles: [], error: 'No roles found' };
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unknown error getting roles';
				return { roles: [], error: message };
			}
		},
		[authenticatedApiClient, scope.project_id],
	);

	const migrateRoles = useCallback(
		async (
			sourceEnvId: string,
			targetEnvId: string,
			conflictStrategy: ConflictStrategy = 'override',
		): Promise<MigrationStats> => {
			const cleanRoleDataForUpdate = (role: RoleRead): RoleUpdatePayload => {
				// Uses the RoleRead type which has optional extends/attributes
				return {
					name: role.name || role.key,
					description: role.description || undefined,
					permissions: role.permissions || undefined,
					extends: role.extends || undefined,
					attributes: role.attributes || undefined,
				};
			};

			const stats: MigrationStats = {
				total: 0,
				success: 0,
				failed: 0,
				details: [],
			};
			try {
				if (!scope.project_id) throw new Error('Project ID missing');

				const { roles: sourceRoles, error: sourceRolesError } =
					await getRoles(sourceEnvId);
				if (sourceRolesError) {
					stats.details?.push(`Get source roles error: ${sourceRolesError}`);
					return stats;
				}
				if (!sourceRoles || sourceRoles.length === 0) {
					stats.details?.push('No source roles found');
					return stats;
				}

				const { roles: targetRoles } = await getRoles(targetEnvId);
				const targetRoleKeys = new Set(
					targetRoles?.map(role => role.key).filter(Boolean),
				);
				stats.total = sourceRoles.length;

				for (const role of sourceRoles) {
					try {
						if (!role?.key) {
							stats.failed++;
							continue;
						}

						const roleDataForPost: RoleCreate = {
							key: role.key,
							name: role.name || role.key,
							description: role.description || undefined,
							permissions: role.permissions || undefined,
							extends: role.extends || undefined,
							attributes: role.attributes || undefined,

							granted_to: role.granted_to as
								| components['schemas']['DerivedRoleBlockEdit']
								| undefined,
						};
						const roleDataForPatch = cleanRoleDataForUpdate(role);

						if (targetRoleKeys.has(role.key)) {
							if (conflictStrategy === 'override') {
								try {
									const updateEndpoint = `/v2/schema/{proj_id}/{env_id}/roles/{role_id}`;
									const updateResult = await authenticatedApiClient().PATCH(
										updateEndpoint,
										{ role_id: role.key },
										roleDataForPatch,
										undefined,
									);
									if (updateResult.error) {
										stats.failed++;
										stats.details?.push(
											`Update role error ${role.key}: ${updateResult.error}`,
										);
									} else {
										stats.success++;
									}
								} catch (error) {
									stats.failed++;
									stats.details?.push(
										`Update role exception ${role.key}: ${error}`,
									);
								}
							} else {
								stats.failed++;
								stats.details?.push(`Conflict role: ${role.key}`);
							}
						} else {
							try {
								const createResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/roles`,
									{ env_id: targetEnvId },
									roleDataForPost,
									undefined,
								);
								if (createResult.error) {
									stats.failed++;
									const errorMessage =
										typeof createResult.error === 'string'
											? createResult.error
											: JSON.stringify(createResult.error);
									stats.details?.push(
										`Create role error ${role.key}: ${errorMessage}`,
									);
								} else {
									stats.success++;
									targetRoleKeys.add(role.key);
								}
							} catch (error) {
								stats.failed++;
								stats.details?.push(
									`Create role exception ${role.key}: ${error}`,
								);
							}
						}
					} catch (roleError) {
						stats.failed++;
						stats.details?.push(
							`Processing role error ${role.key}: ${roleError}`,
						);
					}
				}
				return stats;
			} catch (err) {
				stats.details?.push(`Role migration error: ${err}`);
				return stats;
			}
		},
		[getRoles, authenticatedApiClient, scope.project_id],
	);

	return { migrateRoles, getRoles };
};

export default useMigrateRoles;

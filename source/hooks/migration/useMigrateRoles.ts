// hooks/migration/useMigrateRoles.ts
import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, Role, ConflictStrategy } from './types.js';

const useMigrateRoles = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();

	/**
	 * Gets a list of roles from the environment
	 */
	const getRoles = useCallback(
		async (environmentId: string) => {
			if (!scope.project_id) {
				return {
					roles: [],
					error: 'Project ID is not available in the current scope',
				};
			}

			// Try known roles API endpoints
			const rolesEndpoint = `/v2/schema/{proj_id}/{env_id}/roles`;

			try {
				const { data: rolesResponse, error } =
					await authenticatedApiClient().GET(rolesEndpoint, {
						proj_id: scope.project_id,
						env_id: environmentId,
					});

				if (error) {
					return { roles: [], error };
				}

				if (rolesResponse) {
					// Handle different response formats
					const roles = Array.isArray(rolesResponse)
						? rolesResponse
						: rolesResponse &&
							  typeof rolesResponse === 'object' &&
							  'data' in rolesResponse &&
							  Array.isArray(rolesResponse.data)
							? rolesResponse.data
							: [];

					if (roles.length > 0) {
						return { roles, error: null };
					}
				}

				return { roles: [], error: 'No roles found' };
			} catch (error) {
				return {
					roles: [],
					error: error instanceof Error ? error.message : 'Unknown error',
				};
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

				// Get roles from source environment
				const { roles: sourceRoles, error: sourceRolesError } =
					await getRoles(sourceEnvId);

				if (sourceRolesError) {
					stats.details?.push(`Error getting roles: ${sourceRolesError}`);
					return stats;
				}

				if (!sourceRoles || sourceRoles.length === 0) {
					stats.details?.push('No roles found in source environment');
					return stats;
				}

				// Get roles from target environment
				const { roles: targetRoles } = await getRoles(targetEnvId);

				// Create a map of existing role keys in target
				const targetRoleKeys = new Set(
					targetRoles?.map(role => role?.key).filter(Boolean),
				);

				stats.total = sourceRoles.length;

				// Create or update each role
				for (let i = 0; i < sourceRoles.length; i++) {
					const role = sourceRoles[i];

					try {
						if (!role?.key) {
							stats.failed++;
							continue;
						}

						// Create minimal role object with required fields
						const roleData: Role = {
							key: role.key,
							name: role.name || role.key,
							description: role.description || '',
							permissions: role.permissions || [],
						};

						// Check if role already exists in target
						if (targetRoleKeys.has(role.key)) {
							if (conflictStrategy === 'override') {
								try {
									// Use PUT for update
									const updateResult = await authenticatedApiClient().PUT(
										`/v2/schema/{proj_id}/{env_id}/roles/{role_id}`,
										{
											proj_id: scope.project_id,
											env_id: targetEnvId,
											role_id: role.key,
										},
										roleData,
										undefined,
									);

									if (updateResult.error) {
										stats.failed++;
										stats.details?.push(
											`Failed to update role ${role.key}: ${updateResult.error}`,
										);
									} else {
										stats.success++;
									}
								} catch (error) {
									stats.failed++;
									stats.details?.push(
										`Error updating role ${role.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
									);
								}
							} else {
								stats.failed++;
								stats.details?.push(
									`Role ${role.key} already exists (conflict=fail)`,
								);
							}
						} else {
							// Create the role
							try {
								const createResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/roles`,
									{
										proj_id: scope.project_id,
										env_id: targetEnvId,
									},
									roleData,
									undefined,
								);

								if (createResult.error) {
									stats.failed++;
									if (
										createResult.error.includes &&
										createResult.error.includes('MISSING_PERMISSIONS')
									) {
										stats.details?.push(
											`Role ${role.key} requires missing permissions. Consider migrating resources first.`,
										);
									} else {
										stats.details?.push(
											`Failed to create role ${role.key}: ${createResult.error}`,
										);
									}
								} else {
									stats.success++;
									targetRoleKeys.add(role.key);
								}
							} catch (error) {
								stats.failed++;
								stats.details?.push(
									`Error creating role ${role.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
								);
							}
						}
					} catch (roleError) {
						stats.failed++;
						stats.details?.push(
							`Error processing role: ${roleError instanceof Error ? roleError.message : 'Unknown error'}`,
						);
					}
				}

				return stats;
			} catch (err) {
				stats.details?.push(
					`Role migration error: ${err instanceof Error ? err.message : 'Unknown error'}`,
				);
				return stats;
			}
		},
		[getRoles, authenticatedApiClient, scope.project_id],
	);

	return { migrateRoles, getRoles };
};

export default useMigrateRoles;

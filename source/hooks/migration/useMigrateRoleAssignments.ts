// hooks/migration/useMigrateRoleAssignments.ts
import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, RoleAssignment, ConflictStrategy } from './types.js';
import useMigrateRoles from './useMigrateRoles.js';

const useMigrateRoleAssignments = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();
	const { getRoles } = useMigrateRoles();

	const migrateRoleAssignments = useCallback(
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

				// Get role assignments
				const { data: roleAssignmentsResponse, error: roleAssignmentsError } =
					await authenticatedApiClient().GET(
						`/v2/facts/{proj_id}/{env_id}/role_assignments`,
						{
							proj_id: scope.project_id,
							env_id: sourceEnvId,
						},
						undefined,
						{ per_page: 100 },
					);

				if (roleAssignmentsError) {
					stats.details?.push(
						`Error getting role assignments: ${roleAssignmentsError}`,
					);
					return stats;
				}

				if (!roleAssignmentsResponse) {
					stats.details?.push(
						'No role assignments found in source environment',
					);
					return stats;
				}

				// Handle different response formats
				const assignments = Array.isArray(roleAssignmentsResponse)
					? roleAssignmentsResponse
					: roleAssignmentsResponse &&
						  typeof roleAssignmentsResponse === 'object' &&
						  'data' in roleAssignmentsResponse &&
						  Array.isArray(roleAssignmentsResponse.data)
						? roleAssignmentsResponse.data
						: [];

				// Filter for top-level assignments only
				const topLevelAssignments = assignments.filter(
					assignment => assignment && !assignment.resource_instance,
				);

				stats.total = topLevelAssignments.length;

				// Get the list of valid roles in the target environment
				const { roles: targetRoles } = await getRoles(targetEnvId);

				// Create a set of valid role keys for tracking
				const validRoleKeys = new Set(
					targetRoles?.map(role => role?.key).filter(Boolean),
				);

				// Process each role assignment
				for (let i = 0; i < topLevelAssignments.length; i++) {
					const assignment = topLevelAssignments[i];

					try {
						if (!assignment || !assignment.user || !assignment.role) {
							stats.failed++;
							continue;
						}

						// Extract string values for role and user
						const roleKey =
							typeof assignment.role === 'object'
								? assignment.role.key
								: String(assignment.role);

						// Check if role exists in target environment
						if (!validRoleKeys.has(roleKey)) {
							// Try to create the role on-the-fly as a fallback
							try {
								const createRoleResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/roles`,
									{
										proj_id: scope.project_id,
										env_id: targetEnvId,
									},
									{
										key: roleKey,
										name: roleKey,
										description: `Auto-created role during migration`,
									},
									undefined,
								);

								if (!createRoleResult.error) {
									validRoleKeys.add(roleKey);
								}
							} catch (error) {
								// Continue with assignment attempt even if role creation fails
							}
						}

						// Create assignment object with proper typing
						const assignmentData: Record<string, any> = {
							user:
								typeof assignment.user === 'object'
									? assignment.user.key
									: String(assignment.user),
							role: roleKey,
							tenant:
								typeof assignment.tenant === 'object'
									? assignment.tenant.key
									: String(assignment.tenant || 'default'),
						};

						try {
							const createResult = await authenticatedApiClient().POST(
								`/v2/facts/{proj_id}/{env_id}/role_assignments`,
								{
									proj_id: scope.project_id,
									env_id: targetEnvId,
								},
								assignmentData,
								undefined,
							);

							if (createResult.error) {
								// Handle specific error cases
								if (
									createResult.error.includes &&
									(createResult.error.includes("could not find 'Role'") ||
										createResult.error.includes('role does not exist'))
								) {
									stats.failed++;
									stats.details?.push(
										`Failed to assign role ${roleKey}: role does not exist`,
									);
								} else if (
									createResult.error.includes &&
									createResult.error.includes('already exists') &&
									conflictStrategy === 'override'
								) {
									// Consider as success if it already exists and override is enabled
									stats.success++;
								} else {
									stats.failed++;
									stats.details?.push(
										`Failed to assign role ${roleKey}: ${createResult.error}`,
									);
								}
							} else {
								stats.success++;
							}
						} catch (error) {
							stats.failed++;
							stats.details?.push(
								`Error creating assignment: ${error instanceof Error ? error.message : 'Unknown error'}`,
							);
						}
					} catch (assignmentError) {
						stats.failed++;
						stats.details?.push(
							`Error processing assignment: ${assignmentError instanceof Error ? assignmentError.message : 'Unknown error'}`,
						);
					}
				}

				return stats;
			} catch (err) {
				stats.details?.push(
					`Role assignment migration error: ${err instanceof Error ? err.message : 'Unknown error'}`,
				);
				return stats;
			}
		},
		[authenticatedApiClient, getRoles, scope.project_id],
	);

	return { migrateRoleAssignments };
};

export default useMigrateRoleAssignments;

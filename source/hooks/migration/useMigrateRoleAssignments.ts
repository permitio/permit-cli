import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, ConflictStrategy } from './types.js';
import useMigrateRoles from './useMigrateRoles.js';

const ERROR_ROLE_DOES_NOT_EXIST = 'role does not exist';
const ERROR_FAILED_TO_ASSIGN = 'Failed to assign role ';
const ERROR_ROLE_ASSIGNMENT = 'Role assignment migration error: ';
const ERROR_CREATING_ASSIGNMENT = 'Error creating assignment: ';
const ERROR_PROCESSING_ASSIGNMENT = 'Error processing assignment: ';
const ERROR_NO_ROLE_ASSIGNMENTS =
	'No role assignments found in source environment';
const ERROR_NO_PROJECT_ID = 'Project ID is not available in the current scope';
const ERROR_GETTING_ASSIGNMENTS = 'Error getting role assignments: ';
const UNKNOWN_ERROR = 'Unknown error';

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
					throw new Error(ERROR_NO_PROJECT_ID);
				}

				// Get role assignments
				const { data: roleAssignmentsResponse, error: roleAssignmentsError } =
					await authenticatedApiClient().GET(
						`/v2/facts/{proj_id}/{env_id}/role_assignments`,
						{
							env_id: sourceEnvId,
						},
						undefined,
						{ per_page: 100 },
					);

				if (roleAssignmentsError) {
					stats.details?.push(
						`${ERROR_GETTING_ASSIGNMENTS}${roleAssignmentsError}`,
					);
					return stats;
				}

				if (!roleAssignmentsResponse) {
					stats.details?.push(ERROR_NO_ROLE_ASSIGNMENTS);
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

						const userKey =
							typeof assignment.user === 'object'
								? assignment.user.key
								: String(assignment.user);

						const tenantKey =
							assignment.tenant && typeof assignment.tenant === 'object'
								? assignment.tenant.key
								: String(assignment.tenant || 'default');

						// Check if role exists in target environment
						if (!validRoleKeys.has(roleKey)) {
							// Try to create the role on-the-fly as a fallback
							try {
								const createRoleResult = await authenticatedApiClient().POST(
									`/v2/schema/{proj_id}/{env_id}/roles`,
									{
										env_id: targetEnvId,
									},
									{
										key: roleKey,
										name: roleKey,
										description: `Auto-created role during migration`,
									},
								);

								if (!createRoleResult.error) {
									validRoleKeys.add(roleKey);
								}
							} catch {
								// Continue with assignment attempt even if role creation fails
							}
						}

						// Create assignment object with proper typing
						const assignmentData = {
							user: userKey,
							role: roleKey,
							tenant: tenantKey,
						};

						try {
							const createResult = await authenticatedApiClient().POST(
								`/v2/facts/{proj_id}/{env_id}/role_assignments`,
								{
									env_id: targetEnvId,
								},
								assignmentData,
							);

							if (createResult.error) {
								// Handle specific error cases
								if (
									createResult.error.includes &&
									(createResult.error.includes("could not find 'Role'") ||
										createResult.error.includes(ERROR_ROLE_DOES_NOT_EXIST))
								) {
									stats.failed++;
									stats.details?.push(
										`${ERROR_FAILED_TO_ASSIGN}${roleKey}: ${ERROR_ROLE_DOES_NOT_EXIST}`,
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
										`${ERROR_FAILED_TO_ASSIGN}${roleKey}: ${createResult.error}`,
									);
								}
							} else {
								stats.success++;
							}
						} catch (createError) {
							stats.failed++;
							stats.details?.push(
								`${ERROR_CREATING_ASSIGNMENT}${createError instanceof Error ? createError.message : UNKNOWN_ERROR}`,
							);
						}
					} catch (assignmentError) {
						stats.failed++;
						stats.details?.push(
							`${ERROR_PROCESSING_ASSIGNMENT}${assignmentError instanceof Error ? assignmentError.message : UNKNOWN_ERROR}`,
						);
					}
				}

				return stats;
			} catch (err) {
				stats.details?.push(
					`${ERROR_ROLE_ASSIGNMENT}${err instanceof Error ? err.message : UNKNOWN_ERROR}`,
				);
				return stats;
			}
		},
		[authenticatedApiClient, getRoles, scope.project_id],
	);

	return { migrateRoleAssignments };
};

export default useMigrateRoleAssignments;

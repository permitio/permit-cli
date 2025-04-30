import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, User, ConflictStrategy } from './types.js';

const useMigrateUsers = () => {
	const { authenticatedApiClient } = useClient();
	const { scope } = useAuth();

	const migrateUsers = useCallback(
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

				// Get all users in one call
				const { data: sourceUsersResponse } =
					await authenticatedApiClient().GET(
						`/v2/facts/{proj_id}/{env_id}/users`,
						{
							proj_id: scope.project_id,
							env_id: sourceEnvId,
						},
						undefined,
						{ per_page: 100 },
					);

				if (!sourceUsersResponse) {
					stats.details?.push('No users found in source environment');
					return stats;
				}

				// Handle different response formats
				const users = Array.isArray(sourceUsersResponse)
					? sourceUsersResponse
					: sourceUsersResponse &&
						  typeof sourceUsersResponse === 'object' &&
						  'data' in sourceUsersResponse &&
						  Array.isArray(sourceUsersResponse.data)
						? sourceUsersResponse.data
						: [];

				stats.total = users.length;

				// Process each user
				for (let i = 0; i < users.length; i++) {
					const user = users[i];

					try {
						if (!user || !user.key) {
							stats.failed++;
							continue;
						}

						// Create a minimal user object with only required fields
						const userData: User = {
							key: user.key,
							email: user.email || undefined,
							first_name: user.first_name || undefined,
							last_name: user.last_name || undefined,
							attributes: user.attributes || {},
						};

						// Create the user in target
						try {
							const createResult = await authenticatedApiClient().POST(
								`/v2/facts/{proj_id}/{env_id}/users`,
								{
									proj_id: scope.project_id,
									env_id: targetEnvId,
								},
								userData,
								undefined,
							);

							if (createResult.error) {
								if (
									createResult.error.includes &&
									createResult.error.includes('already exists') &&
									conflictStrategy === 'override'
								) {
									// Try to update instead
									const updateResult = await authenticatedApiClient().PUT(
										`/v2/facts/{proj_id}/{env_id}/users/{user_id}`,
										{
											proj_id: scope.project_id,
											env_id: targetEnvId,
											user_id: user.key,
										},
										userData,
										undefined,
									);

									if (updateResult.error) {
										stats.failed++;
										stats.details?.push(
											`Failed to update user ${user.key}: ${updateResult.error}`,
										);
									} else {
										stats.success++;
									}
								} else {
									stats.failed++;
									stats.details?.push(
										`Failed to create user ${user.key}: ${createResult.error}`,
									);
								}
							} else {
								stats.success++;
							}
						} catch (error) {
							stats.failed++;
							stats.details?.push(
								`Error creating user ${user.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
							);
						}
					} catch (userError) {
						stats.failed++;
						stats.details?.push(
							`Error processing user: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
						);
					}
				}

				return stats;
			} catch (err) {
				stats.details?.push(
					`User migration error: ${err instanceof Error ? err.message : 'Unknown error'}`,
				);
				return stats;
			}
		},
		[authenticatedApiClient, scope.project_id],
	);

	return { migrateUsers };
};

export default useMigrateUsers;

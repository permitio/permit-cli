import { useCallback } from 'react';
import useClient from '../useClient.js';
import { useAuth } from '../../components/AuthProvider.js';
import { MigrationStats, ConflictStrategy } from './types.js';
import { components } from '../../lib/api/v1.js';

// Define a type for the API response
interface ApiResponse<T> {
	data?: T;
	error: string | null;
	response?: Response;
	status?: number;
}

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
				if (!scope.project_id) throw new Error('Project ID missing');

				const { data: sourceUsersResponse } =
					await authenticatedApiClient().GET(
						`/v2/facts/{proj_id}/{env_id}/users`,
						{ env_id: sourceEnvId },
						undefined,
						{ per_page: 100 },
					);

				if (!sourceUsersResponse) {
					stats.details?.push('No source users');
					return stats;
				}

				const users: ReadonlyArray<components['schemas']['UserRead']> =
					Array.isArray(sourceUsersResponse)
						? sourceUsersResponse
						: sourceUsersResponse.data || [];

				stats.total = users.length;

				// Get the API client
				const client = authenticatedApiClient();

				const post = client.POST as (
					path: string,
					pathParams: Record<string, string>,
					body: unknown,
					queryParams?: Record<string, unknown>,
				) => Promise<ApiResponse<unknown>>;

				const put = client.PUT as (
					path: string,
					pathParams: Record<string, string>,
					body: unknown,
					queryParams?: Record<string, unknown>,
				) => Promise<ApiResponse<unknown>>;

				for (let i = 0; i < users.length; i++) {
					const user = users[i];
					try {
						if (!user || !user.key) {
							stats.failed++;
							continue;
						}

						// Construct payload matching UserCreate schema
						const userData: components['schemas']['UserCreate'] = {
							key: user.key,
							email: user.email || undefined,
							first_name: user.first_name || undefined,
							last_name: user.last_name || undefined,
							attributes: user.attributes || {},
						};

						try {
							const createResult = await post(
								`/v2/facts/{proj_id}/{env_id}/users`,
								{ env_id: targetEnvId },
								userData,
								undefined,
							);

							if (createResult.error) {
								const errorMessage =
									typeof createResult.error === 'string'
										? createResult.error
										: JSON.stringify(createResult.error);

								if (
									errorMessage.includes('already exists') &&
									conflictStrategy === 'override'
								) {
									try {
										const updateResult = await put(
											`/v2/facts/{proj_id}/{env_id}/users/{user_id}`,
											{ env_id: targetEnvId, user_id: user.key },
											userData,
											undefined,
										);

										if (updateResult.error) {
											stats.failed++;
											stats.details?.push(
												`Update user error ${user.key}: ${updateResult.error}`,
											);
										} else {
											stats.success++;
										}
									} catch (error) {
										stats.failed++;
										stats.details?.push(
											`Update user exception ${user.key}: ${error}`,
										);
									}
								} else {
									stats.failed++;
									stats.details?.push(
										`Create user error ${user.key}: ${errorMessage}`,
									);
								}
							} else {
								stats.success++;
							}
						} catch (error) {
							stats.failed++;
							stats.details?.push(
								`Create/Update user exception ${user.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
							);
						}
					} catch (userError) {
						const userKey = user?.key || `unknown_user_at_index_${i}`;
						stats.failed++;
						stats.details?.push(
							`Processing user error ${userKey}: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
						);
					}
				}
				return stats;
			} catch (err) {
				stats.details?.push(`User migration error: ${err}`);
				return stats;
			}
		},
		[authenticatedApiClient, scope.project_id],
	);

	return { migrateUsers };
};

export default useMigrateUsers;

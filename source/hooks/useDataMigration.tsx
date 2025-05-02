import { useCallback } from 'react';
import useMigrateUsers from './migration/useMigrateUsers.js';
import useMigrateRoles from './migration/useMigrateRoles.js';
import useMigrateResources from './migration/useMigrateResources.js';
import useMigrateRoleAssignments from './migration/useMigrateRoleAssignments.js';
import { ConflictStrategy } from './migration/types.js';

export const useDataMigration = () => {
	const { migrateUsers } = useMigrateUsers();
	const { migrateRoles } = useMigrateRoles();
	const { migrateResources } = useMigrateResources();
	const { migrateRoleAssignments } = useMigrateRoleAssignments();

	const migrateAllData = useCallback(
		async (
			sourceEnvId: string,
			targetEnvId: string,
			options: {
				skipUsers?: boolean;
				skipResources?: boolean;
				conflictStrategy?: ConflictStrategy;
			} = {},
		) => {
			const {
				skipUsers = false,
				skipResources = false,
				conflictStrategy = 'override',
			} = options;

			const results = {
				users: { total: 0, success: 0, failed: 0 },
				roles: { total: 0, success: 0, failed: 0 },
				resources: { total: 0, success: 0, failed: 0 },
				roleAssignments: { total: 0, success: 0, failed: 0 },
			};

			try {
				// First, migrate resources if not skipped (resources should come first)
				if (!skipResources) {
					console.log('Migrating resources...');
					const resourceStats = await migrateResources(
						sourceEnvId,
						targetEnvId,
						conflictStrategy,
					);
					results.resources = {
						total: resourceStats.total,
						success: resourceStats.success,
						failed: resourceStats.failed,
					};
					console.log(
						`Resources migrated: ${resourceStats.success}/${resourceStats.total}`,
					);
				}

				// Then, migrate users if not skipped
				if (!skipUsers) {
					console.log('Migrating users...');
					const userStats = await migrateUsers(
						sourceEnvId,
						targetEnvId,
						conflictStrategy,
					);
					results.users = {
						total: userStats.total,
						success: userStats.success,
						failed: userStats.failed,
					};
					console.log(
						`Users migrated: ${userStats.success}/${userStats.total}`,
					);

					// Migrate roles (needed for role assignments)
					console.log('Migrating roles...');
					const roleStats = await migrateRoles(
						sourceEnvId,
						targetEnvId,
						conflictStrategy,
					);
					results.roles = {
						total: roleStats.total,
						success: roleStats.success,
						failed: roleStats.failed,
					};
					console.log(
						`Roles migrated: ${roleStats.success}/${roleStats.total}`,
					);

					// Add a small delay to ensure users and roles are processed
					await new Promise(resolve => setTimeout(resolve, 1000));

					// Finally, migrate role assignments
					console.log('Migrating role assignments...');
					const roleAssignmentStats = await migrateRoleAssignments(
						sourceEnvId,
						targetEnvId,
						conflictStrategy,
					);
					results.roleAssignments = {
						total: roleAssignmentStats.total,
						success: roleAssignmentStats.success,
						failed: roleAssignmentStats.failed,
					};
					console.log(
						`Role assignments migrated: ${roleAssignmentStats.success}/${roleAssignmentStats.total}`,
					);
				}

				return results;
			} catch (error) {
				console.error('Migration error:', error);
				throw error;
			}
		},
		[migrateUsers, migrateRoles, migrateResources, migrateRoleAssignments],
	);

	return {
		migrateAllData,
		migrateUsers,
		migrateRoles,
		migrateResources,
		migrateRoleAssignments,
	};
};

export default useDataMigration;

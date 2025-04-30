// hooks/useDataMigration.tsx
import useMigrateResources from './migration/useMigrateResources.js';
import useMigrateUsers from './migration/useMigrateUsers.js';
import useMigrateRoles from './migration/useMigrateRoles.js';
import useMigrateRoleAssignments from './migration/useMigrateRoleAssignments.js';

export const useDataMigration = () => {
	const { migrateResources } = useMigrateResources();
	const { migrateUsers } = useMigrateUsers();
	const { migrateRoles } = useMigrateRoles();
	const { migrateRoleAssignments } = useMigrateRoleAssignments();

	return {
		migrateUsers,
		migrateRoleAssignments,
		migrateRoles,
		migrateResources,
	};
};

export default useDataMigration;

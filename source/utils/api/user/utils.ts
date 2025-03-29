export type UserSyncOptions = {
	key: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	attributes?: Record<string, never>;
	roleAssignments?: Array<{
		role: string;
		tenant?: string;
	}>;
};

export function validate(options: UserSyncOptions) {
	const useridRegex = /^[A-Za-z0-9@+\-._]+$/;
	if (!options.key) {
		throw new Error('Missing Error: userid is required');
	}
	if (options.key && !useridRegex.test(options.key)) {
		console.log(options.key);
		console.log(useridRegex.test(options.key));
		throw new Error('Validation Error: Invalid userid');
	}
	const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
	if (options.email && !emailRegex.test(options.email)) {
		throw new Error('Validation Error: Invalid email');
	}
	const nameRegex = /^[A-Za-z]{2,50}$/;
	if (options.firstName && !nameRegex.test(options.firstName)) {
		throw new Error('Validation Error: Invalid firstName');
	}
	if (options.lastName && !nameRegex.test(options.lastName)) {
		throw new Error('Validation Error: Invalid lastName');
	}
	if (options.attributes && typeof options.attributes !== 'object') {
		throw new Error('Validation Error: Invalid attributes');
	}
	if (options.roleAssignments && !Array.isArray(options.roleAssignments)) {
		throw new Error('Validation Error: Invalid roleAssignments');
	}
	return true;
}

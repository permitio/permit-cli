import { useMemo } from 'react';
import { UserSyncOptions } from '../utils/api/user/utils.js';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../commands/api/sync/user.js';

// Define a proper type for options
type SyncOptions = zType<typeof originalOptions>;

// Function to parse attributes (Convert array of "key:value" into an object)
function parseAttributes(attributesArray: string[]): Record<string, never> {
	const attributes: Record<string, string> = {};
	for (const attr of attributesArray) {
		const [key, value] = attr.split(':').map(s => s.trim());
		if (key && value) {
			attributes[key] = value;
		}
	}
	return attributes as Record<string, never>;
}

// Function to parse role strings based on given patterns
type RoleAssignment = {
	role: string;
	tenant?: string;
	resourceInstance?: string;
};

const isSimpleRole = (role: string): boolean =>
	role.split('/').length === 1 &&
	role.split(':').length === 1 &&
	role.split('#').length === 1;

const isTenantRole = (role: string): boolean =>
	role.includes('/') && !role.includes(':') && !role.includes('#');

const isResourceInstanceRole = (role: string): boolean =>
	role.includes(':') && role.includes('#') && !role.includes('/');

const isTenantResourceRole = (role: string): boolean =>
	role.includes('/') && role.includes(':') && role.includes('#');

const parseSingleRoleString = (roleString: string): RoleAssignment | null => {
	const trimmed = roleString.trim();
	if (!trimmed) return null;

	if (isSimpleRole(trimmed)) {
		return { role: trimmed, tenant: 'default' };
	}
	if (isTenantRole(trimmed)) {
		const [tenant, role] = trimmed.split('/').map(s => s.trim());
		return role ? { tenant, role } : null;
	}
	if (isResourceInstanceRole(trimmed)) {
		const [resourceInstancePart, role] = trimmed.split('#');
		if (!resourceInstancePart || !role) return null;

		const [resourceType, resourceInstance] = resourceInstancePart.split(':');
		return { resourceInstance: `${resourceType}:${resourceInstance}`, role };
	}
	if (isTenantResourceRole(trimmed)) {
		const [tenantResource, role] = trimmed.split('#');
		if (!tenantResource || !role) return null;

		const [tenant, resourceInstancePart] = tenantResource.split('/');
		if (!tenant || !resourceInstancePart) return null;

		const [resourceType, resourceInstance] = resourceInstancePart.split(':');
		return {
			tenant,
			resourceInstance: `${resourceType}:${resourceInstance}`,
			role,
		};
	}

	console.warn(`Invalid role format: ${trimmed}`);
	return null;
};

function parseRolesAssignmentStrings(rolesArray: string[]): RoleAssignment[] {
	const parsedRoles: RoleAssignment[] = [];

	for (const roleString of rolesArray) {
		const parsedRole = parseSingleRoleString(roleString);
		if (parsedRole) {
			parsedRoles.push(parsedRole);
		}
	}

	return parsedRoles;
}

export function useParseUserData(
	options: SyncOptions,
	overrideUserId?: string,
): {
	payload: UserSyncOptions;
	parseError: string | null;
	updatePayloadKey: (newKey: string) => void;
} {
	const payloadRef = useMemo(() => {
		let attributes: Record<string, string> = {};
		let roleAssignments: Array<{
			role: string;
			tenant?: string;
			resourceInstance?: string;
		}> = [];
		let parseError: string | null = null;

		// Parse attributes if provided
		if (options.attributes) {
			try {
				if (Array.isArray(options.attributes)) {
					attributes = parseAttributes(options.attributes);
				}
			} catch (error) {
				parseError = `Failed to parse attributes: ${error instanceof Error ? error.message : String(error)}`;
			}
		}

		// Parse role assignments if provided
		if (options.roles) {
			try {
				if (Array.isArray(options.roles)) {
					roleAssignments = parseRolesAssignmentStrings(options.roles);
				}
			} catch (error) {
				parseError = `Failed to parse roles: ${error instanceof Error ? error.message : String(error)}`;
			}
		}

		// Use provided key or overrideUserId
		const userKey = overrideUserId || options.key || '';

		// Create the final payload object
		const payload: UserSyncOptions = {
			key: userKey,
			email: options.email,
			firstName: options.firstName,
			lastName: options.lastName,
			attributes: attributes as Record<string, never>,
			roleAssignments,
		};

		return {
			payload,
			parseError,
			updateKey: (newKey: string) => {
				payload.key = newKey;
			},
		};
	}, [
		options.key,
		options.email,
		options.firstName,
		options.lastName,
		options.attributes,
		options.roles,
		overrideUserId,
	]);

	return {
		payload: payloadRef.payload,
		parseError: payloadRef.parseError,
		updatePayloadKey: payloadRef.updateKey,
	};
}

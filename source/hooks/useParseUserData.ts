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
function parseRolesString(
	rolesArray: string[],
): Array<{ role: string; tenant?: string; resourceInstance?: string }> {
	const parsedRoles: Array<{
		role: string;
		tenant?: string;
		resourceInstance?: string;
	}> = [];

	for (const roleString of rolesArray) {
		const trimmed = roleString.trim();
		if (!trimmed) continue;

		// Match the role string to one of the patterns
		if (/^\w+$/.test(trimmed)) {
			parsedRoles.push({ role: trimmed, tenant: 'default' });
		} else if (/^\w+\/\w+$/.test(trimmed)) {
			const [tenant, role] = trimmed.split('/').map(s => s.trim());
			if (role) {
				parsedRoles.push({ tenant, role });
			}
		} else if (/^\w+:\w+#\w+$/.test(trimmed)) {
			const [resourceInstancePart, role] = trimmed.split('#');
			if (resourceInstancePart && role) {
				const [resourceType, resourceInstance] =
					resourceInstancePart.split(':');
				parsedRoles.push({
					resourceInstance: `${resourceType}:${resourceInstance}`,
					role,
				});
			}
		} else if (/^\w+\/\w+:\w+#\w+$/.test(trimmed)) {
			const [tenantResource, role] = trimmed.split('#');
			if (role && tenantResource) {
				const [tenant, resourceInstancePart] = tenantResource.split('/');
				if (tenant && resourceInstancePart) {
					const [resourceType, resourceInstance] =
						resourceInstancePart.split(':');
					parsedRoles.push({
						tenant,
						resourceInstance: `${resourceType}:${resourceInstance}`,
						role,
					});
				}
			}
		} else {
			console.warn(`Invalid role format: ${trimmed}`);
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
					roleAssignments = parseRolesString(options.roles);
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

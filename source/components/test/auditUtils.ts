import {
	AuditLog,
	AuditLogResponseData,
	DetailedAuditLog,
	AuditContext,
	PdpRequestData,
} from './auditTypes.js';

/**
 * Collects all resource types from audit logs
 */
export const collectResourceTypes = (logs: AuditLog[]): Set<string> => {
	const types = new Set<string>();
	logs.forEach(log => {
		if (log.resource_type) {
			types.add(log.resource_type);
		}
	});
	return types;
};

/**
 * Gets a default resource type when none is provided
 */
export const getDefaultResourceType = (types: Set<string>): string => {
	for (const type of types) {
		return type; // Return the first type found
	}
	return 'resource'; // Return default if Set is empty
};

/**
 * Check if a value is a valid AuditContext
 */
export function isValidAuditContext(value: unknown): value is AuditContext {
	if (!value || typeof value !== 'object') return false;

	const ctx = value as Record<string, unknown>;
	return (
		'user' in ctx &&
		'resource' in ctx &&
		'tenant' in ctx &&
		'action' in ctx &&
		typeof ctx['user'] === 'object' &&
		typeof ctx['resource'] === 'object'
	);
}

/**
 * Normalizes and enriches a detailed log with consistent fields
 */
export const normalizeDetailedLog = (
	response: AuditLogResponseData,
	originalLog: AuditLog,
	resourceTypes: Set<string>,
): DetailedAuditLog | null => {
	try {
		// Get a suitable resource type
		const resourceType =
			response.resource_type ||
			originalLog.resource_type ||
			getDefaultResourceType(resourceTypes);

		// Get user identifier
		const userId =
			response.user_key || response.user_email || originalLog.user_key || '';

		if (!userId) {
			return null;
		}

		// Create a default context
		const defaultContext: AuditContext = {
			user: {
				id: userId,
				key: userId,
			},
			resource: {
				type: resourceType,
				id: response.resource || originalLog.resource || '',
			},
			tenant: response.tenant || originalLog.tenant || 'default',
			action: response.action || originalLog.action || '',
		};

		// Check if response.context is a valid AuditContext
		const contextValue = isValidAuditContext(response.context)
			? response.context
			: defaultContext;

		// Create a normalized detailed log
		const detailedLog: DetailedAuditLog = {
			...(response as AuditLog),
			id: response.id || originalLog.id,
			timestamp: response.timestamp || originalLog.timestamp,
			user_id: userId,
			user_key: response.user_key || originalLog.user_key,
			resource: response.resource || originalLog.resource || '',
			resource_type: resourceType,
			tenant: response.tenant || originalLog.tenant || 'default',
			action: response.action || originalLog.action || '',
			decision: response.decision === true,
			context: contextValue,
		};

		return detailedLog;
	} catch {
		// Just returning null on any error
		return null;
	}
};

/**
 * Creates a properly formatted PDP request
 */
export const createPdpRequest = (
	log: DetailedAuditLog,
	resourceTypes: Set<string>,
): PdpRequestData => {
	return {
		tenant: log.tenant || 'default',
		action: log.action,
		user: {
			key: log.user_key || log.user_id,
		},
		resource: {
			type: log.resource_type || getDefaultResourceType(resourceTypes),
			...(log.resource ? { key: log.resource } : {}),
		},
	};
};

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
): DetailedAuditLog | null => {
	try {
		// Get resource type, preferring explicit type from logs
		const resourceType =
			response.resource_type || originalLog.resource_type || '';

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
			debug: response.debug as DetailedAuditLog['debug'],
		};

		return detailedLog;
	} catch {
		return null;
	}
};

/**
 * Creates a properly formatted PDP request
 */
export const createPdpRequest = (log: DetailedAuditLog): PdpRequestData => {
	// Extract context for attributes if available
	const context = log.context || ({} as AuditContext);

	const userAttributes =
		context.user && 'attributes' in context.user
			? context.user.attributes || {}
			: {};

	// Safely extract resource attributes
	const resourceAttributes =
		context.resource && 'attributes' in context.resource
			? context.resource.attributes || {}
			: {};


	let resourceKey = '';
	let resourceId = '';

	
	const rebacAllowingRoles = log.debug?.rebac?.allowing_roles;

	
	if (rebacAllowingRoles && rebacAllowingRoles.length > 0) {
		const rebacResource = rebacAllowingRoles[0]?.resource;
		if (typeof rebacResource === 'string' && rebacResource.includes(':')) {
			resourceKey = rebacResource;
			const parts = rebacResource.split(':');
			if (parts.length >= 2 && parts[1]) {
				resourceId = parts[1];
			}
		}
	}
	
	else {
		const isResourceInstance =
			typeof log.resource === 'string' && log.resource.includes(':');

		if (isResourceInstance) {
			// For specific resource instances, use the entire string as key
			resourceKey = log.resource || '';

			// If it's in format "type:id", also extract the ID part
			const parts = resourceKey.split(':');
			if (parts.length >= 2 && parts[1]) {
				resourceId = parts[1];
			}
		} else {
			// For normal resources, use the resource value
			resourceKey = log.resource || '';
		}
	}

	// Determine the resource type with fallbacks
	let resourceType = 'resource';

	if (log.resource_type && log.resource_type.length > 0) {
		resourceType = log.resource_type;
	} else if (resourceKey.includes(':')) {
		const typeFromKey = resourceKey.split(':')[0];
		if (typeFromKey && typeFromKey.length > 0) {
			resourceType = typeFromKey;
		}
	}

	const pdpRequest: PdpRequestData = {
		tenant: log.tenant || 'default',
		action: log.action,
		user: {
			key: log.user_key || log.user_id,
			attributes: userAttributes,
		},
		resource: {
			type: resourceType,
			key: resourceKey,
			attributes: resourceAttributes,
		},
	};

	// Only add resourceId if it exists
	if (resourceId) {
		pdpRequest.resource.id = resourceId;
	}

	// Add context if available
	if ('context' in context && context.context) {
		pdpRequest.context = context.context;
	}

	return pdpRequest;
};

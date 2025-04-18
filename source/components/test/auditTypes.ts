/**
 * Core API response types
 */
export interface ApiScope {
	project_id: string;
	environment_id: string;
	organization_id: string;
}

export interface AuditLog {
	id: string;
	timestamp: string;
	user_key?: string;
	user_email?: string;
	resource?: string;
	resource_type?: string;
	action: string;
	tenant: string | null;
	decision: boolean;
	pdp_config_id?: string;
}

export interface AuditContext {
	user: {
		id: string;
		key?: string;
		attributes?: Record<string, string | number | boolean>;
	};
	resource: {
		type: string;
		id: string;
		attributes?: Record<string, string | number | boolean>;
	};
	tenant: string;
	action: string;
	context?: Record<string, unknown>;
}

export interface DebugInformation {
	rebac?: {
		allow?: boolean;
		allowing_roles?: Array<{
			resource: string;
			role: string;
			reason: string;
			sources: Array<{
				type: string;
				[key: string]: unknown;
			}>;
			[key: string]: unknown;
		}>;
		code?: string;
		reason?: string;
		[key: string]: unknown;
	};
	rbac?: Record<string, unknown>;
	abac?: Record<string, unknown>;
	request?: {
		action?: string;
		resource?: Record<string, unknown>;
		tenant?: string;
		user?: Record<string, unknown>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface DetailedAuditLog extends AuditLog {
	user_id: string;
	context?: AuditContext;
	debug?: DebugInformation;
}

/**
 * API-specific types for requests and responses
 */
export interface AuditLogResponseData {
	id?: string;
	timestamp?: string;
	user_key?: string;
	user_email?: string;
	resource?: string;
	resource_type?: string;
	action?: string;
	tenant?: string | null;
	decision?: boolean;
	pdp_config_id?: string;
	context?: unknown;
	debug?: unknown;
	[key: string]: unknown;
}

/**
 * PDP request data
 */
export interface PdpRequestData {
	tenant: string;
	action: string;
	user: {
		key: string;
		attributes?: Record<string, string | number | boolean>;
	};
	resource: {
		type: string;
		key?: string;
		id?: string;
		attributes?: Record<string, string | number | boolean>;
	};
	context?: Record<string, unknown>;
}

export interface PdpResponseData {
	allow?: boolean;
	allowed?: boolean;
	result?: boolean;
	[key: string]: unknown;
}

/**
 * Component-specific types
 */
export interface CommandOptions {
	pdpUrl: string;
	timeFrame: number;
	sourcePdp?: string;
	users?: string[];
	resources?: string[];
	tenant?: string;
	action?: string;
	decision?: 'allow' | 'deny';
	maxLogs?: number;
}

export interface ComparisonResult {
	auditLog: DetailedAuditLog;
	originalDecision: boolean;
	newDecision: boolean;
	matches: boolean;
	error?: string;
}

export interface ProgressState {
	current: number;
	total: number;
}

export type ProcessPhase = 'fetching' | 'processing' | 'checking' | 'complete';

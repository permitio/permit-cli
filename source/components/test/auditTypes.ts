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
}

export interface DetailedAuditLog extends AuditLog {
	user_id: string;
	context?: AuditContext;
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
	[key: string]: unknown;
}

export interface PdpRequestData {
	tenant: string;
	action: string;
	user: { key: string };
	resource: { type: string; key?: string };
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

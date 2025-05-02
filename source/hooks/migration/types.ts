export interface MigrationStats {
	total: number;
	success: number;
	failed: number;
	details?: string[];
}

export interface ResourceAction {
	name: string;
	description?: string;
}

export interface ResourceAttribute {
	type: string;
	description?: string;
}

export interface Resource {
	key: string;
	name?: string;
	description?: string;
	actions?: Record<string, ResourceAction>;
	attributes?: Record<string, ResourceAttribute>;
}

export interface User {
	key: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	attributes?: Record<string, unknown>;
}

export interface Role {
	key: string;
	name: string;
	description?: string;
	permissions?: string[];
	resource?: string;
}

export interface RoleAssignment {
	user: string | { key: string; [key: string]: unknown };
	role: string | { key: string; [key: string]: unknown };
	tenant?: string | { key: string; [key: string]: unknown };
	resource_instance?: string;
}

export type ConflictStrategy = 'override' | 'fail';

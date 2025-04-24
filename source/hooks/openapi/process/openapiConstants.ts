// Define constants for repeated error messages
export const ERROR_CREATING_RESOURCE = 'Failed to create resource';
export const ERROR_CREATING_ROLE = 'Failed to create role';
export const ERROR_UPDATING_ROLE = 'Failed to update role';
export const ERROR_CREATING_RESOURCE_ROLE = 'Failed to create resource role';

// Define all x-permit extensions as object properties
export const PERMIT_EXTENSIONS = {
	RESOURCE: 'x-permit-resource',
	ACTION: 'x-permit-action',
	ROLE: 'x-permit-role',
	RESOURCE_ROLE: 'x-permit-resource-role',
	RELATION: 'x-permit-relation',
	DERIVED_ROLE: 'x-permit-derived-role',
};

// Define interface types
export interface ResourceKey {
	key: string;
}
export interface RoleKey {
	key: string;
}
export interface RoleWithPermissions {
	permissions?: string[];
}
export interface UrlMapping {
	url: string;
	http_method: string;
	resource: string;
	action: string;
}

export interface ProcessorContext {
	resources: Set<string>;
	actions: Map<string, Set<string>>;
	roles: Set<string>;
	resourceRoles: Map<string, boolean>;
	relations: Map<string, string>;
	mappings: UrlMapping[];
	errors: string[];
	warnings: string[];
	existingResources: ResourceKey[];
	existingRoles: RoleKey[];
	baseUrl: string;
}

export interface ProcessorProps {
	inputPath: string;
	setProgress: (message: string) => void;
	setStatus: (status: 'loading' | 'error' | 'success') => void;
	setError: (error: string | null) => void;
	setProcessingDone: (done: boolean) => void;
}

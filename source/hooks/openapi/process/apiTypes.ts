// Response types
export interface ResourceResponse {
	key: string;
	name: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

export interface ActionResponse {
	key: string;
	name: string;
	description?: string;
}

export interface RoleResponse {
	key: string;
	name: string;
	description?: string;
	permissions?: string[];
}

export interface RelationResponse {
	key: string;
	name: string;
	subject_resource: string;
	object_resource: string;
	description?: string;
}

export interface DerivedRoleResponse {
	base_role: string;
	derived_role: string;
	resource: string;
	relation?: string;
}

export interface UrlMappingResponse {
	id: string;
	url: string;
	http_method: string;
	resource: string;
	action: string;
}

// Request types
export interface RelationRequest {
	key: string;
	name: string;
	subject_resource: string;
	object_resource: string;
	description?: string;
}

export interface DerivedRoleRequest {
	base_role: string;
	derived_role: string;
	resource: string;
	relation?: string;
}

export interface UrlMappingRequest {
	url: string;
	http_method: string;
	resource: string;
	action: string;
}

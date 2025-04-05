export interface ActionDefinition {
	name?: string;
	description?: string;
	attributes?: Record<string, never>;
	v1compat_path?: string;
	v1compat_name?: string;
}

export interface ResourceDefinition {
	key: string;
	name: string;
	urn?: string;
	description?: string;
	attributes?: Record<string, never>;
	actions: Record<string, ActionDefinition>;
	type_attributes?: Record<string, never>;
	relations?: Record<string, string>;
	v1compat_path?: string;
	v1compat_name?: string;
	v1compat_type?: string;
}

export interface RoleDefinition {
	key: string;
	name: string;
	description?: string;
	permissions?: string[];
	attributes?: Record<string, never>;
	extends?: string[];
	granted_to?: {
		when: {
			no_direct_roles_on_object: boolean;
		};
		users_with_role: {
			role: string;
			on_resource: string;
			linked_by_relation: string;
			when: {
				no_direct_roles_on_object: boolean;
			};
		}[];
	};

	v1compat_settings?: Record<string, never>;
	v1compat_attributes?: Record<string, never>;
}

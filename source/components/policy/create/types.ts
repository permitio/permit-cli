export interface Resource {
	name: string;
	actions: string[];
}

export interface Permission {
	resource: string;
	actions: string[];
}

export interface Role {
	name: string;
	permissions: Permission[];
}

export interface PolicyData {
	resources: Resource[];
	roles: Role[];
}

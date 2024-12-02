import { apiCall } from '../lib/api.js';
import { useMemo } from 'react';

export type Role = {
	id: string; // UUID: Unique id of the role
	key: string; // URL-friendly name of the role (slug)
	name: string; // The name of the role
	description?: string; // Optional description explaining the role
	permissions: string[]; // List of actions this role is permitted to perform
	attributes?: Record<string, string>; // Optional key-value metadata for filtering
	extends: string[]; // List of roles this role extends
	granted_to?: Record<string, string>; // Derived role definition block
	v1compat_settings?: Record<string, string>; // Optional v1 compatibility settings
	v1compat_attributes?: Record<string, string>; // Optional v1 compatibility attributes
	organization_id: string; // UUID of the organization this role belongs to
	project_id: string; // UUID of the project this role belongs to
	environment_id: string; // UUID of the environment this role belongs to
	created_at: string; // ISO_8601: Date and time when the role was created
	updated_at: string; // ISO_8601: Date and time when the role was last updated
};

export const useRolesApi = () => {
	const getRoles = async (
		projectId: string,
		envId: string,
		authToken: string,
	) => {
		return await apiCall<Role[]>(
			`v2/schema/${projectId}/${envId}/roles`,
			authToken,
		);
	};

	return useMemo(
		() => ({
			getRoles,
		}),
		[],
	);
};

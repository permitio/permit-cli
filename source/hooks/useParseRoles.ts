import { components } from '../lib/api/v1.js';

export function useParseRoles(
	roleStrings?: string[],
): components['schemas']['RoleCreate'][] {
	if (!roleStrings || roleStrings.length === 0) return [];

	try {
		return roleStrings.map(roleStr => {
			// Split role definition into main part and permissions part
			const [mainPart, permissionPart] = roleStr.split('@').map(s => s.trim());

			if (!mainPart) {
				throw new Error('Invalid role format');
			}

			// Split main part into key and description
			const [key, description] = mainPart.split(':').map(s => s.trim());

			if (!key) {
				throw new Error(`Invalid role key in: ${roleStr}`);
			}

			// Process permissions if they exist
			const permissions = permissionPart
				? permissionPart
						.split('|')
						.map(p => p.trim())
						.filter(Boolean)
				: undefined;

			return {
				key,
				name: key,
				description: description || undefined,
				permissions,
			};
		});
	} catch (err) {
		throw new Error(
			`Invalid role format. Expected ["name:description@resource:action|resource:action"], got ${JSON.stringify(roleStrings) + err}`,
		);
	}
}

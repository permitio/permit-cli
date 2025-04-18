import { components } from '../lib/api/v1.js';

/**
 * Parses role strings in the format:
 *   "role:resource:action|resource:action" or "role:resource"
 * If availableActions is provided, expands resource-only permissions to all actions.
 */
export function useParseRoles(
	roleStrings?: string[],
	availableActions?: string[],
): components['schemas']['RoleCreate'][] {
	if (!roleStrings || roleStrings.length === 0) return [];

	try {
		return roleStrings.map(roleStr => {
			const trimmed = roleStr.trim();
			if (!trimmed) throw new Error('Invalid role format');

			const [roleKey, ...permParts] = trimmed.split(':');
			if (!roleKey || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(roleKey)) {
				throw new Error(`Invalid role key in: ${roleStr}`);
			}
			if (permParts.length === 0) {
				throw new Error(
					`Role must have at least one resource or resource:action in: ${roleStr}`,
				);
			}

			// Join back in case there are multiple colons, then split by '|'
			const permissionsRaw = permParts
				.join(':')
				.split('|')
				.map(p => p.trim())
				.filter(Boolean);

			const permissions: string[] = [];
			for (const perm of permissionsRaw) {
				const [resource, action] = perm.split(':');
				if (!resource)
					throw new Error(`Invalid resource in permission: ${perm}`);
				if (!action) {
					// Expand to all actions if availableActions is provided
					if (availableActions && availableActions.length > 0) {
						permissions.push(...availableActions.map(a => `${resource}:${a}`));
					} else {
						permissions.push(resource); // fallback: just resource
					}
				} else {
					permissions.push(`${resource}:${action}`);
				}
			}

			return {
				key: roleKey,
				name: roleKey,
				permissions,
			};
		});
	} catch (err) {
		throw new Error(
			`Invalid role format. Expected ["role:resource:action|resource:action"], got ${JSON.stringify(roleStrings)}. ${err instanceof Error ? err.message : err}`,
		);
	}
}

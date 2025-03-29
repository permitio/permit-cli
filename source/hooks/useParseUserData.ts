import { useMemo } from 'react';
import { UserSyncOptions } from '../utils/api/user/utils.js';
import { type infer as zType } from 'zod';
import { options as originalOptions } from '../commands/api/sync/user.js';

// Define a proper type for options
type SyncOptions = zType<typeof originalOptions>;

// Helper function to sanitize potential JSON input
function sanitizeJson(input: string): string {
	// Trim the input
	let sanitized = input.trim();

	// Remove wrapping quotes that might cause double quoting
	if (
		(sanitized.startsWith('"') && sanitized.endsWith('"')) ||
		(sanitized.startsWith("'") && sanitized.endsWith("'"))
	) {
		sanitized = sanitized.slice(1, -1);
	}

	// Replace single quotes with double quotes
	sanitized = sanitized.replace(/'/g, '"');

	// Fix unquoted keys (replace `key:` with `"key":`)
	sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

	// Fix unquoted string values (replace `: value` with `: "value"`)
	// More robust regex that doesn't match already quoted strings or numeric values
	// Fix the escape characters
	sanitized = sanitized.replace(
		/:\s*(?!(\s*["'\d[{true|false|null]))([a-zA-Z][a-zA-Z0-9_\s-]*)(?=[,}])/g,
		function (_match, _p1, p2) {
			return ': "' + p2.trim() + '"';
		},
	);

	return sanitized;
}

// Function to parse comma-separated role format
function parseRolesString(
	rolesString: string,
): Array<{ role: string; tenant?: string }> {
	// Split by commas
	const roleEntries = rolesString.split(',');
	const roles: Array<{ role: string; tenant?: string }> = [];

	for (const entry of roleEntries) {
		const trimmed = entry.trim();
		if (!trimmed) continue;

		// Check if it contains a colon (role:tenant format)
		if (trimmed.includes(':')) {
			const [role, tenant] = trimmed.split(':').map(s => s.trim());
			if (role) {
				roles.push({ role, tenant });
			}
		} else {
			// Only role without tenant
			roles.push({ role: trimmed });
		}
	}

	return roles;
}

export function useParseUserData(
	options: SyncOptions,
	overrideUserId?: string,
): {
	payload: UserSyncOptions;
	parseError: string | null;
	updatePayloadKey: (newKey: string) => void;
} {
	// Create a mutable reference that can be updated
	const payloadRef = useMemo(() => {
		let attributes = {};
		let roleAssignments: Array<{ role: string; tenant?: string }> = [];
		let parseError: string | null = null;

		// Parse attributes with detailed error handling
		if (options.attributes) {
			try {
				if (typeof options.attributes === 'string') {
					// Sanitize and parse the JSON string
					const sanitized = sanitizeJson(options.attributes);
					try {
						attributes = JSON.parse(sanitized);
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
					} catch (_) {
						// Fallback: Try to parse attribute as simple key/value pairs

						// Convert to simple key/value pairs
						const simpleAttributes: Record<string, string> = {};
						const pairs = options.attributes.replace(/[{}"']/g, '').split(',');

						for (const pair of pairs) {
							if (pair.includes(':')) {
								const [key, value] = pair.split(':').map(p => p.trim());
								if (key) {
									simpleAttributes[key] = value || '';
								}
							}
						}

						attributes = simpleAttributes;
					}
				} else if (typeof options.attributes === 'object') {
					attributes = options.attributes;
				}
			} catch (error) {
				parseError = `Failed to parse attributes JSON: ${
					error instanceof Error ? error.message : String(error)
				}`;
			}
		}

		// Parse role assignments from roles field with detailed error handling
		if (options.roles) {
			try {
				if (typeof options.roles === 'string') {
					// First try to parse as a comma-separated list
					if (!options.roles.trim().startsWith('[')) {
						// Not a JSON array, try comma-separated format
						roleAssignments = parseRolesString(options.roles);
					} else {
						// Looks like a JSON array, try to parse it
						const sanitized = sanitizeJson(options.roles);
						const parsedRoles = JSON.parse(sanitized);

						if (Array.isArray(parsedRoles)) {
							roleAssignments = parsedRoles.map(item => ({
								role: item.role || '',
								tenant: item.tenant,
							}));
						} else {
							parseError =
								'Role assignments must be a JSON array or comma-separated list';
						}
					}
				} else if (Array.isArray(options.roles)) {
					roleAssignments = options.roles;
				}
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (_) {
				// Try comma-separated format as a fallback
				try {
					roleAssignments = parseRolesString(options.roles);
				} catch (error) {
					// Using the outer error variable instead of creating a new one
					parseError = `Failed to parse role assignments: ${
						error instanceof Error ? error.message : String(error)
					}`;
				}
			}
		}

		// Use provided key or overrideUserId
		const userKey = overrideUserId || options.key || '';

		// Create the initial payload object
		const payload: UserSyncOptions = {
			key: userKey,
			email: options.email,
			firstName: options.firstName,
			lastName: options.lastName,
			attributes,
			roleAssignments,
		};

		return {
			payload,
			parseError,
			// Function to update the key
			updateKey: (newKey: string) => {
				payload.key = newKey;
			},
		};
	}, [
		options.key,
		options.email,
		options.firstName,
		options.lastName,
		options.attributes,
		options.roles,
		overrideUserId,
	]);

	return {
		payload: payloadRef.payload,
		parseError: payloadRef.parseError,
		updatePayloadKey: payloadRef.updateKey,
	};
}

/**
 * Utility functions and types for OpenAPI processing
 */

export interface Operation {
	'x-permit-action'?: string;
	'x-permit-role'?: string;
	'x-permit-resource-role'?: string;
	'x-permit-relation'?: Record<string, string>;
	'x-permit-derived-role'?: {
		base_role: string;
		derived_role: string;
		resource?: string;
		relation?: string;
	};
	[key: string]: unknown;
}

// Define path item type with Permit extensions
export interface PathItem {
	'x-permit-resource'?: string;
	get?: Operation;
	post?: Operation;
	put?: Operation;
	delete?: Operation;
	patch?: Operation;
	options?: Operation;
	head?: Operation;
	[key: string]: unknown;
}

// Define proper type for OpenAPI document and extensions
export interface OpenApiDocument {
	paths?: Record<string, PathItem>;
	servers?: Array<{ url: string }>;
	[key: string]: unknown;
}

// Define relation object type
export interface RelationObject {
	key: string;
	name: string;
	subject_resource: string;
	object_resource: string;
	description?: string;
}

// Define derived role object type
export interface DerivedRoleObject {
	key: string;
	name: string;
	base_role: string;
	derived_role: string;
	resource?: string;
	relation?: string;
	description?: string;
}

// Define URL mapping type
export interface UrlMapping {
	url: string;
	http_method: string;
	resource: string;
	action: string;
	headers?: Record<string, string>;
}

// Define error object type for better error handling
export interface ErrorObject {
	error_code?: string;
	title?: string;
	message?: string;
	detail?: string;
}

export const HTTP_METHODS = [
	'get',
	'post',
	'put',
	'delete',
	'patch',
	'options',
	'head',
] as const;

/**
 * Convert resource keys to valid format (no colons, only alphanumeric, dashes, underscores)
 */
export const sanitizeKey = (key: string): string => {
	if (!key) return '';

	// Replace all special characters with underscores
	// Keep only alphanumeric characters and underscores
	return key
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_-]/g, '_') // Replace invalid chars with underscores
		.replace(/_+/g, '_') // Replace multiple underscores with one
		.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

/**
 * Check if error is a duplicate entity error
 */
export const isDuplicateError = (error: unknown): boolean => {
	let isDuplicate = false; // Initialize return value
	const ALREADY_EXISTS_MSG = 'already exists';
	const DUPLICATE_ENTITY_CODE = 'DUPLICATE_ENTITY';
	const ROLE_ALREADY_EXISTS_TITLE = 'This role already exists';

	try {
		// Check string errors
		if (typeof error === 'string') {
			if (
				error.includes(DUPLICATE_ENTITY_CODE) ||
				error.includes(ALREADY_EXISTS_MSG) ||
				error.includes('duplicate key') ||
				error.includes('already defined')
			) {
				isDuplicate = true;
			} else {
				// Try to parse JSON string errors only if it wasn't a direct string match
				try {
					const parsedError = JSON.parse(error) as ErrorObject;
					if (
						parsedError.error_code === DUPLICATE_ENTITY_CODE ||
						parsedError.title === ROLE_ALREADY_EXISTS_TITLE ||
						(parsedError.detail &&
							typeof parsedError.detail === 'string' &&
							parsedError.detail.includes(ALREADY_EXISTS_MSG))
					) {
						isDuplicate = true;
					}
				} catch {
					// Ignore JSON parsing errors - this is expected for non-JSON error strings
				}
			}
		}
		// Check error objects only if it wasn't a string match
		else if (typeof error === 'object' && error !== null) {
			const errorObj = error as ErrorObject;

			if (
				errorObj.error_code === DUPLICATE_ENTITY_CODE ||
				errorObj.title === ROLE_ALREADY_EXISTS_TITLE ||
				(errorObj.detail &&
					typeof errorObj.detail === 'string' &&
					(errorObj.detail.includes(ALREADY_EXISTS_MSG) ||
						errorObj.detail.includes('duplicate'))) ||
				(errorObj.message &&
					typeof errorObj.message === 'string' &&
					(errorObj.message.includes(ALREADY_EXISTS_MSG) ||
						errorObj.message.includes(DUPLICATE_ENTITY_CODE)))
			) {
				isDuplicate = true;
			}
		}
	} catch {
		// Ignore any errors during error type checking - continue with default result
	}

	return isDuplicate; // Explicitly return the boolean variable
};

// Response data types
export interface ApiResponseData<T> {
	data?: T[];
	[key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
	success?: boolean;
	data?: T;
	error?: string | ErrorObject | null;
	status?: number;
}

/**
 * Utility functions and types for OpenAPI processing
 */
// Define proper type for OpenAPI document and extensions
export interface OpenApiDocument {
	paths?: Record<string, PathItem>;
	servers?: Array<{ url: string }>;
	[key: string]: unknown;
  }
  
  // Custom operation type with Permit extensions
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
  
  // HTTP methods as a constant array to avoid duplication
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
	  .replace(/[^a-z0-9_-]/g, '_')    // Replace invalid chars with underscores
	  .replace(/_+/g, '_')             // Replace multiple underscores with one
	  .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
  };
  
  /**
   * Check if error is a duplicate entity error
   */
  export const isDuplicateError = (error: unknown): boolean => {
	// Check string errors
	if (typeof error === 'string') {
	  return (
		error.includes('DUPLICATE_ENTITY') || 
		error.includes('already exists') ||
		error.includes('duplicate key') ||
		error.includes('already defined')
	  );
	}
	
	try {
	  // Check error objects
	  if (typeof error === 'object' && error !== null) {
		const errorObj = error as ErrorObject;
		
		// Check direct error code
		if (errorObj.error_code === 'DUPLICATE_ENTITY') {
		  return true;
		}
		
		// Check title field
		if (errorObj.title === 'This role already exists') {
		  return true;
		}
		
		// Check detail field
		if (errorObj.detail && (
		  typeof errorObj.detail === 'string' &&
		  (errorObj.detail.includes('already exists') || 
		   errorObj.detail.includes('duplicate'))
		)) {
		  return true;
		}
		
		// Check message field
		if (errorObj.message && (
		  typeof errorObj.message === 'string' && 
		  (errorObj.message.includes('already exists') || 
		   errorObj.message.includes('DUPLICATE_ENTITY'))
		)) {
		  return true;
		}
	  }
	  
	  // Try to parse JSON string errors
	  if (typeof error === 'string') {
		try {
		  const parsedError = JSON.parse(error) as ErrorObject;
		  return (
			parsedError.error_code === 'DUPLICATE_ENTITY' ||
			parsedError.title === 'This role already exists' ||
			(parsedError.detail && typeof parsedError.detail === 'string' && 
			 parsedError.detail.includes('already exists'))
		  );
		} catch {
		  // Not a parseable JSON string
		}
	  }
	} catch {
	  // Error checking failed, assume not a duplicate error
	}
	
	return false;
  };
  
  // Response data types
  export interface ApiResponseData<T> {
	data?: T[];
	[key: string]: unknown;
  }
  
  export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: ApiResponseData<T> | T;
	error?: string | null;
	status?: number;
  }
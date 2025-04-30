import {
	sanitizeKey,
	PathItem,
	Operation,
	HTTP_METHODS,
	ApiResponse,
} from '../../../utils/openapiUtils.js';
import { PERMIT_EXTENSIONS, ProcessorContext } from './openapiConstants.js';
import { UrlMappingRequest, UrlMappingResponse } from './apiTypes.js';

export async function generateUrlMappings(
	context: ProcessorContext,
	pathItems: Record<string, PathItem>,
) {
	const { mappings, baseUrl } = context;

	for (const [pathKey, pathItem] of Object.entries(pathItems || {})) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		const typedPathItem = pathItem as PathItem;

		const rawResource = typedPathItem[PERMIT_EXTENSIONS.RESOURCE];
		if (!rawResource) continue;

		const resource = sanitizeKey(rawResource as string);

		// Process HTTP methods
		for (const method of HTTP_METHODS) {
			const operation = typedPathItem[method] as Operation | undefined;
			if (!operation) continue;

			// Add URL mapping with absolute path
			const action = operation[PERMIT_EXTENSIONS.ACTION] || method;
			mappings.push({
				url: baseUrl ? `${baseUrl}${pathKey}` : pathKey,
				http_method: method as string,
				resource: resource,
				action: action as string,
			});
		}
	}

	return context;
}

// Define function type signatures
type DeleteUrlMappingsFunction = (
	source: string,
) => Promise<ApiResponse<Record<string, unknown>>>;
type CreateUrlMappingsFunction = (
	mappings: UrlMappingRequest[],
	authType: string,
	tokenHeader: string,
) => Promise<ApiResponse<UrlMappingResponse[]>>;

export async function createMappings(
	context: ProcessorContext,
	deleteUrlMappings: DeleteUrlMappingsFunction,
	createUrlMappings: CreateUrlMappingsFunction,
) {
	const { mappings, errors } = context;

	// Create URL mappings
	if (mappings.length > 0) {
		try {
			// Try to delete existing mappings first
			try {
				await deleteUrlMappings('openapi');
			} catch {
				// No existing mappings to delete or error deleting
			}

			const result = await createUrlMappings(
				mappings as UrlMappingRequest[],
				'Bearer',
				'openapi_token',
			);

			if (result.error) {
				errors.push(
					`Failed to create URL mappings: ${JSON.stringify(result.error)}`,
				);
			}
		} catch (mappingError) {
			errors.push(`Error creating URL mappings: ${mappingError}`);
		}
	}

	return context;
}

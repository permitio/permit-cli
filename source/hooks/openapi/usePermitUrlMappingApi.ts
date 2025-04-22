import { useCallback, useMemo } from 'react';
import { UrlMappingRequest, UrlMappingResponse } from './process/apiTypes.js';

// Define a more specific type for the delete response
type DeleteResponse = { message?: string };

type DeleteUrlMappingsFn = (
	configKey: string,
) => Promise<{ data: DeleteResponse; error: null }>;
type CreateUrlMappingsFn = (
	mappings: UrlMappingRequest[],
	authType: string,
	tokenHeader: string,
) => Promise<{ data: UrlMappingResponse[]; error: null }>;

/**
 * Hook for URL mapping API operations
 * Implemented with properly typed response patterns
 */
export const usePermitUrlMappingApi = () => {
	/**
	 * Delete existing URL mappings by config key
	 */
	const deleteUrlMappingsImpl = useCallback(async () => {
		// Mock implementation with proper return type
		return {
			data: { message: 'Config deleted successfully' },
			error: null,
		};
	}, []);

	/**
	 * Creates URL mappings for the Permit proxy
	 */
	const createUrlMappingsImpl = useCallback(
		async (
			mappings: UrlMappingRequest[],
		): Promise<{ data: UrlMappingResponse[]; error: null }> => {
			// Create a properly typed mock response
			const mockResponses: UrlMappingResponse[] = mappings.map(
				(mapping, index) => ({
					id: `mock-${index}`,
					url: mapping.url,
					http_method: mapping.http_method,
					resource: mapping.resource,
					action: mapping.action,
				}),
			);

			return {
				data: mockResponses,
				error: null,
			};
		},
		[],
	);

	return useMemo(
		() => ({
			deleteUrlMappings: deleteUrlMappingsImpl as DeleteUrlMappingsFn,
			createUrlMappings: createUrlMappingsImpl as CreateUrlMappingsFn,
		}),
		[deleteUrlMappingsImpl, createUrlMappingsImpl],
	);
};

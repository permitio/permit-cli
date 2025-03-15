import { WarningCollector } from './types.js';

export function createSafeId(...parts: string[]): string {
	return parts
		.map(part => (part || '').replace(/[^a-zA-Z0-9_]/g, '_'))
		.filter(Boolean)
		.join('_');
}

export function createWarningCollector(): WarningCollector {
	const warnings: string[] = [];

	return {
		addWarning(warning: string) {
			warnings.push(warning);
		},
		getWarnings() {
			return warnings;
		},
	};
}

export const generateProviderBlock = () => `
terraform {
  required_providers {
    permitio = {
      source = "permitio/permit-io"
      version = "~> 0.0.12"
    }
  }
}

variable "PERMIT_API_KEY" {
  type        = string
  description = "The API key for the Permit.io API"
}

provider "permitio" {
  api_url = "https://api.permit.io"
  api_key = var.PERMIT_API_KEY
}
`;

export interface PaginatedResponse<T> {
	data: T[];
	pagination?: {
		total_count?: number;
		page?: number;
		per_page?: number;
	};
}

/**
 * Generic utility to fetch all pages of results from any list endpoint
 */
export async function fetchList<T, P extends Record<string, any>>(
	listFunction: (params: P) => Promise<T[] | PaginatedResponse<T>>,
	baseParams: P,
	page: number = 1,
	perPage: number = 100,
): Promise<T[]> {
	let allResults: T[] = [];
	let currentPage = page;
	let hasMoreResults = true;

	while (hasMoreResults) {
		const params = {
			...baseParams,
			page: currentPage,
			perPage,
		} as P;

		const response = await listFunction(params);

		// Handle different response types
		let pageResults: T[];
		if (Array.isArray(response)) {
			// Direct array response
			pageResults = response;
			// If it's a direct array, assume it contains all results
			hasMoreResults = false;
		} else {
			// Paginated response
			pageResults = response.data || [];

			// Check if we've reached the end based on pagination info or results length
			if (response.pagination) {
				const {
					page = 1,
					per_page = perPage,
					total_count,
				} = response.pagination;

				if (total_count !== undefined) {
					// If we have total count, use it to determine if there are more pages
					hasMoreResults = page * per_page < total_count;
				} else {
					// Otherwise use the results length
					hasMoreResults = pageResults.length === per_page;
				}
			} else {
				// No pagination info, use results length
				hasMoreResults = pageResults.length === perPage;
			}
		}

		if (pageResults.length > 0) {
			allResults = [...allResults, ...pageResults];
			currentPage++;
		} else {
			// No results in this page
			hasMoreResults = false;
		}
	}

	return allResults;
}

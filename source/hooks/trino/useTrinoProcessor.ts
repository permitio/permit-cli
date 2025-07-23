/**
 * Hook for processing Trino schema extraction and mapping to Permit resources.
 * Lint/prettier compliant, strict types, ready for implementation.
 */

import { useCallback } from 'react';
import {
	connectToTrino,
	fetchTrinoSchema,
	mapTrinoSchemaToPermitResources,
	TrinoSchemaData,
} from '../../utils/trinoUtils.js';
import { useResourcesApi } from '../useResourcesApi.js';
import type { TrinoOptions } from '../../components/env/trino/types.js';

export function useTrinoProcessor() {
	const { createBulkResources, status, errorMessage } = useResourcesApi();

	/**
	 * Main processing function.
	 * Connects to Trino, extracts schema, maps to Permit resources, and syncs with Permit.
	 */
	const processTrinoSchema = useCallback(
		async (options: TrinoOptions): Promise<void> => {
			// 1. Connect to Trino
			const client = connectToTrino(options);

			// 2. Fetch Trino schema
			const trinoSchema: TrinoSchemaData = await fetchTrinoSchema(client, {
				catalog: options.catalog,
				schema: options.schema,
			});

			// 3. Map to Permit resources
			const permitResources = mapTrinoSchemaToPermitResources(trinoSchema);

			// 4. Sync with Permit (omit 'type' property, ensure actions is an object)
			await createBulkResources(
				permitResources.map(({ actions, ...r }) => ({
					...r,
					actions: Object.fromEntries(
						actions.map((action: string) => [action, {}]),
					),
				})),
			);
		},
		[createBulkResources],
	);

	return { processTrinoSchema, status, errorMessage };
}

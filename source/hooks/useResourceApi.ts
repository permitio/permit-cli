import { useCallback, useState } from 'react';
import useClient from './useClient.js';
import type { ResourceDefinition } from '../lib/policy/utils.js';

export function useResourceApi(
	projectId: string | undefined,
	environmentId: string | undefined,
	apiKey?: string,
) {
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'done' | 'error'
	>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const getExistingResources = useCallback(async () => {
		try {
			const client = apiKey
				? unAuthenticatedApiClient(apiKey)
				: authenticatedApiClient();
			const result = await client.GET(
				`/v2/schema/{proj_id}/{env_id}/resources`,
				{
					proj_id: projectId as string,
					env_id: environmentId as string,
				},
			);
			const error = result.error;

			if (error) throw new Error(error);
			if (!result.data) {
				setErrorMessage('No resources found');
				return new Set();
			}

			type Resource = { key: string };

			const raw = result.data;
			let resources: Resource[] = [];

			if (Array.isArray(raw)) {
				resources = raw;
			} else if (raw && Array.isArray(raw.data)) {
				resources = raw.data;
			} else {
				setErrorMessage('Invalid resource data format');
				return new Set();
			}

			return new Set(resources.map(r => r.key));
		} catch (error) {
			setErrorMessage((error as Error).message);
			return new Set();
		}
	}, [projectId, environmentId, apiKey]);

	const createBulkResources = useCallback(
		async (resources: ResourceDefinition[]) => {
			setStatus('processing');
			setErrorMessage(null);

			try {
				const client = apiKey
					? unAuthenticatedApiClient(apiKey)
					: authenticatedApiClient();

				for (const resource of resources) {
					const { error } = await client.POST(
						`/v2/schema/{proj_id}/{env_id}/resources`,
						{
							proj_id: projectId as string,
							env_id: environmentId as string,
						},
						resource,
					);

					if (error) throw new Error(error);
				}

				setStatus('done');
			} catch (error) {
				setStatus('error');
				setErrorMessage((error as Error).message);
				throw error;
			}
		},
		[projectId, environmentId, apiKey],
	);

	return {
		createBulkResources,
		getExistingResources,
		status,
		errorMessage,
	};
}

import useClient from './useClient.js';
import { useCallback, useMemo, useState } from 'react';
import { components } from '../lib/api/v1.js';

export type ResourceRead = components['schemas']['ResourceRead'];

export const useResourcesApi = () => {
	const { authenticatedApiClient } = useClient();
	const [status, setStatus] = useState<
		'idle' | 'processing' | 'done' | 'error'
	>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const getResources = useCallback(async () => {
		return await authenticatedApiClient().GET(
			`/v2/schema/{proj_id}/{env_id}/resources`,
		);
	}, [authenticatedApiClient]);

	const getExistingResources = useCallback(async () => {
		try {
			const client = authenticatedApiClient();
			const result = await client.GET(
				`/v2/schema/{proj_id}/{env_id}/resources`,
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
	}, [authenticatedApiClient]);

	const createBulkResources = useCallback(
		async (resources: components['schemas']['ResourceCreate'][]) => {
			setStatus('processing');
			setErrorMessage(null);

			try {
				const client = authenticatedApiClient();

				for (const resource of resources) {
					const { error } = await client.POST(
						`/v2/schema/{proj_id}/{env_id}/resources`,

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
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getResources,
			getExistingResources,
			createBulkResources,
			status,
			errorMessage,
		}),
		[
			getResources,
			getExistingResources,
			createBulkResources,
			status,
			errorMessage,
		],
	);
};

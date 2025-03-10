import { useCallback, useMemo } from 'react';
import { components } from '../lib/api/v1.js';
import useClient from './useClient.js';
// import { authenticatedApiClient } from '../lib/api.js';

export interface UsageLimits {
	mau: number;
	tenants: number;
	billing_tier: string;
}

export type OrganizationCreate = components['schemas']['OrganizationCreate'];
export type OrganizationReadWithAPIKey =
	components['schemas']['OrganizationReadWithAPIKey'];

export type Settings = object;

export const useOrganisationApi = () => {
	const { authenticatedApiClient } = useClient();

	const getOrgs = useCallback(async () => {
		return await authenticatedApiClient().GET('/v2/orgs');
	}, [authenticatedApiClient]);

	const getOrg = useCallback(
		async (org_id: string) => {
			return await authenticatedApiClient().GET(`/v2/orgs/{org_id}`, {
				org_id,
			});
		},
		[authenticatedApiClient],
	);

	const createOrg = useCallback(
		async (body: OrganizationCreate) => {
			return await authenticatedApiClient().POST(
				`/v2/orgs`,
				undefined,
				body,
				undefined,
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			getOrgs,
			getOrg,
			createOrg,
		}),
		[createOrg, getOrg, getOrgs],
	);
};

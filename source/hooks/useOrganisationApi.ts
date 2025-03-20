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
	const { authenticatedApiClient, unAuthenticatedApiClient } = useClient();

	const getOrgs = useCallback(
		async (accessToken?: string, cookie?: string | null) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET('/v2/orgs')
				: await authenticatedApiClient().GET('/v2/orgs');
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const getOrg = useCallback(
		async (org_id: string, accessToken?: string, cookie?: string | null) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).GET(
						`/v2/orgs/{org_id}`,
						{
							org_id: org_id,
						},
					)
				: await authenticatedApiClient().GET(`/v2/orgs/{org_id}`, {
						org_id,
					});
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
	);

	const createOrg = useCallback(
		async (
			body: OrganizationCreate,
			accessToken?: string,
			cookie?: string | null,
		) => {
			return accessToken || cookie
				? await unAuthenticatedApiClient(accessToken, cookie).POST(
						`/v2/orgs`,
						undefined,
						body,
					)
				: await authenticatedApiClient().POST(
						`/v2/orgs`,
						undefined,
						body,
						undefined,
					);
		},
		[authenticatedApiClient, unAuthenticatedApiClient],
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

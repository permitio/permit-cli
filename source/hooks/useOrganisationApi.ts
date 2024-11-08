import { apiCall } from '../lib/api.js';

export interface Organization {
	key: string;
	id: string;
	is_enterprise: boolean;
	usage_limits: UsageLimits;
	created_at: string;
	updated_at: string;
	name: string;
	settings: Settings;
}

export interface UsageLimits {
	mau: number;
	tenants: number;
	billing_tier: string;
}

export interface Settings {
}

export const useOrganisationApi = () => {

	const getOrgs = async (accessToken: string, cookie: string) => {
		return await apiCall<Organization[]>('v2/orgs', accessToken, cookie);
	};

	const getOrg = async (organizationId: string, accessToken: string, cookie?: string | null) => {
		return await apiCall<Organization>(`v2/orgs/${organizationId}`, accessToken, cookie);
	};

	return {
		getOrgs,
		getOrg
	};
};

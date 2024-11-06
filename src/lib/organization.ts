import { APIError } from "../errors/errors.js";
import { apiCall } from "../utils/apiCall.js";


export type OrgUsageLimits = {
    mau: number;
    tenants: number;
    billing_tier: string;
}

export type Organization = {
    key: string;
    id: string;
    is_enterprise: boolean;
    usage_limits: OrgUsageLimits;
    created_at: string;
    updated_at: string;
    name: string;
    settings: Record<string, any>;
}


export const getOrgs = async (token: string): Promise<Organization[] | APIError> => {
    const result = await apiCall('v2/orgs', token);
    if (result instanceof APIError) {
        return result;
    }
	return result.response as Organization[];
};
    
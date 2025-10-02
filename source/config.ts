export const KEY_FILE_PATH = './permit.key';
export const KEYSTORE_PERMIT_SERVICE_NAME = 'Permit.io';
export const DEFAULT_PERMIT_KEYSTORE_ACCOUNT = 'PERMIT_DEFAULT_ENV';
export const REGION_KEYSTORE_ACCOUNT = 'PERMIT_REGION';

// Region type
export type PermitRegion = 'us' | 'eu';

// Get region from environment variable or default to 'us'
let currentRegion: PermitRegion = (process.env['PERMIT_REGION'] as PermitRegion) || 'us';

// Function to set the current region
export const setRegion = (region: PermitRegion) => {
	currentRegion = region;
};

// Function to get the current region
export const getRegion = (): PermitRegion => {
	return currentRegion;
};

// Function to get region-specific subdomain
const getRegionSubdomain = (region: PermitRegion): string => {
	return region === 'eu' ? 'eu.' : '';
};

// Region-aware URL getters
export const getPermitApiUrl = (): string => {
	const subdomain = getRegionSubdomain(currentRegion);
	return `https://api.${subdomain}permit.io`;
};

export const getPermitOriginUrl = (): string => {
	const subdomain = getRegionSubdomain(currentRegion);
	return `https://app.${subdomain}permit.io`;
};

export const getAuthPermitDomain = (): string => {
	const subdomain = getRegionSubdomain(currentRegion);
	return `app.${subdomain}permit.io`;
};

export const getCloudPdpUrl = (): string => {
	if (currentRegion === 'eu') {
		return 'https://cloudpdp.api.eu-central-1.permit.io';
	}
	return 'https://cloudpdp.api.permit.io';
};

export const getPermitApiStatisticsUrl = (): string => {
	if (currentRegion === 'eu') {
		return 'https://pdp-statistics.api.eu-central-1.permit.io/v2/stats';
	}
	return 'https://pdp-statistics.api.permit.io/v2/stats';
};

export const getApiUrl = (): string => {
	return `${getPermitApiUrl()}/v2/`;
};

export const getFactsApiUrl = (): string => {
	return `${getApiUrl()}facts/`;
};

export const getApiPdpsConfigUrl = (): string => {
	return `${getApiUrl()}pdps/me/config`;
};

export const getAuthApiUrl = (): string => {
	return `${getPermitApiUrl()}/v1/`;
};

// Legacy exports (maintain backwards compatibility)
export const CLOUD_PDP_URL = getCloudPdpUrl();
export const PERMIT_API_URL = getPermitApiUrl();
export const PERMIT_API_STATISTICS_URL = getPermitApiStatisticsUrl();
export const API_URL = getApiUrl();
export const FACTS_API_URL = getFactsApiUrl();
export const API_PDPS_CONFIG_URL = getApiPdpsConfigUrl();
export const PERMIT_ORIGIN_URL = getPermitOriginUrl();
export const AUTH_PERMIT_DOMAIN = getAuthPermitDomain();
export const AUTH_API_URL = getAuthApiUrl();

export const AUTH_REDIRECT_HOST = 'localhost';
export const AUTH_REDIRECT_PORT = 62419;
export const AUTH_REDIRECT_URI = `http://${AUTH_REDIRECT_HOST}:${AUTH_REDIRECT_PORT}`;
// auth.permit.io is common for both regions
export const AUTH_PERMIT_URL = 'https://auth.permit.io';

export const TERRAFORM_PERMIT_URL =
	'https://permit-cli-terraform.up.railway.app';

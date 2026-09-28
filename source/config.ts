export const KEY_FILE_PATH = './permit.key';
export const KEYSTORE_PERMIT_SERVICE_NAME = 'Permit.io';
export const DEFAULT_PERMIT_KEYSTORE_ACCOUNT = 'PERMIT_DEFAULT_ENV';
export const REGION_KEYSTORE_ACCOUNT = 'PERMIT_REGION';

// Region type. The EU region was retired on 2026-09-28 (PER-16377); every
// Permit account is served from the US region now.
export type PermitRegion = 'us';

// Regions that used to exist but whose endpoints are gone. A saved or passed
// value from this list must fail loudly: silently treating it as US would send
// credentials issued by the old region to the US endpoints.
export const RETIRED_REGIONS: readonly string[] = ['eu'];

export const EU_REGION_RETIRED_MESSAGE =
	'The Permit EU region was retired on 2026-09-28 and its endpoints no longer exist. ' +
	'All Permit accounts are now served from the US region. ' +
	'Unset PERMIT_REGION if it is set to "eu", then run `permit logout` and `permit login` ' +
	'(without --region, or with --region us) to log in again.';

export class RetiredRegionError extends Error {
	constructor(readonly region: string) {
		super(EU_REGION_RETIRED_MESSAGE);
		this.name = 'RetiredRegionError';
	}
}

export const isRetiredRegion = (value: unknown): boolean =>
	typeof value === 'string' &&
	RETIRED_REGIONS.includes(value.trim().toLowerCase());

// Raw region value as configured (env var, keychain or --region). It is kept
// raw so that a retired value is still visible to getRegion() and every URL
// getter below refuses to build a URL for it.
let currentRegion: string = process.env['PERMIT_REGION'] || 'us';

// Function to set the current region
export const setRegion = (region: PermitRegion) => {
	currentRegion = region;
};

// Function to get the current region. Throws RetiredRegionError if the
// configured region was retired, so no request is ever built for it.
export const getRegion = (): PermitRegion => {
	if (isRetiredRegion(currentRegion)) {
		throw new RetiredRegionError(currentRegion);
	}
	return 'us';
};

// Adopt a region value read from storage or user input. Throws
// RetiredRegionError for a retired region; any other value resolves to 'us'.
export const adoptRegion = (
	region: string | null | undefined,
): PermitRegion => {
	currentRegion = region || 'us';
	return getRegion();
};

// URL getters. Each one calls getRegion() first so a retired region fails
// before any network request is made.
export const getPermitApiUrl = (): string => {
	getRegion();
	return 'https://api.permit.io';
};

export const getPermitOriginUrl = (): string => {
	getRegion();
	return 'https://app.permit.io';
};

export const getAuthPermitDomain = (): string => {
	getRegion();
	return 'app.permit.io';
};

export const getCloudPdpUrl = (): string => {
	getRegion();
	return 'https://cloudpdp.api.permit.io';
};

export const getPermitApiStatisticsUrl = (): string => {
	getRegion();
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

export const AUTH_REDIRECT_HOST = 'localhost';
export const AUTH_REDIRECT_PORT = 62419;
export const AUTH_REDIRECT_URI = `http://${AUTH_REDIRECT_HOST}:${AUTH_REDIRECT_PORT}`;
export const AUTH_PERMIT_URL = 'https://auth.permit.io';
export const AUTH0_AUDIENCE = 'https://api.permit.io/v1/';

export const TERRAFORM_PERMIT_URL =
	'https://permit-cli-terraform.up.railway.app';

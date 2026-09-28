import { describe, it, expect, beforeEach, vi } from 'vitest';

const US_URLS = {
	getPermitApiUrl: 'https://api.permit.io',
	getPermitOriginUrl: 'https://app.permit.io',
	getAuthPermitDomain: 'app.permit.io',
	getCloudPdpUrl: 'https://cloudpdp.api.permit.io',
	getPermitApiStatisticsUrl: 'https://pdp-statistics.api.permit.io/v2/stats',
	getApiUrl: 'https://api.permit.io/v2/',
	getFactsApiUrl: 'https://api.permit.io/v2/facts/',
	getApiPdpsConfigUrl: 'https://api.permit.io/v2/pdps/me/config',
	getAuthApiUrl: 'https://api.permit.io/v1/',
} as const;

type UrlGetter = keyof typeof US_URLS;
const URL_GETTERS = Object.keys(US_URLS) as UrlGetter[];

describe('Config - Region Support', () => {
	// Reset modules before each test to ensure clean state
	beforeEach(async () => {
		vi.resetModules();
		delete process.env.PERMIT_REGION;
	});

	describe('US region', () => {
		it('should default to US region when no env var is set', async () => {
			const config = await import('../../source/config.js');
			expect(config.getRegion()).toBe('us');
		});

		it('should use US region when PERMIT_REGION=us is set', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getRegion()).toBe('us');
		});

		it.each(URL_GETTERS)('%s returns the US URL', async getter => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config[getter]()).toBe(US_URLS[getter]);
		});

		it.each(URL_GETTERS)(
			'%s returns the US URL when no region is set',
			async getter => {
				const config = await import('../../source/config.js');
				expect(config[getter]()).toBe(US_URLS[getter]);
			},
		);

		it('should have the shared Auth0 audience and auth URL', async () => {
			const config = await import('../../source/config.js');
			expect(config.AUTH0_AUDIENCE).toBe('https://api.permit.io/v1/');
			expect(config.AUTH_PERMIT_URL).toBe('https://auth.permit.io');
		});
	});

	describe('retired EU region', () => {
		it.each(['eu', 'EU', ' eu '])(
			'PERMIT_REGION=%j makes getRegion throw RetiredRegionError',
			async value => {
				process.env.PERMIT_REGION = value;
				const config = await import('../../source/config.js');
				expect(() => config.getRegion()).toThrow(config.RetiredRegionError);
				expect(() => config.getRegion()).toThrow(
					config.EU_REGION_RETIRED_MESSAGE,
				);
			},
		);

		it('importing config with PERMIT_REGION=eu does not throw', async () => {
			process.env.PERMIT_REGION = 'eu';
			await expect(import('../../source/config.js')).resolves.toBeDefined();
		});

		it.each(URL_GETTERS)(
			'%s throws instead of falling back to US when PERMIT_REGION=eu',
			async getter => {
				process.env.PERMIT_REGION = 'eu';
				const config = await import('../../source/config.js');
				expect(() => config[getter]()).toThrow(config.RetiredRegionError);
			},
		);

		it('adoptRegion("eu") throws and keeps every URL getter failing', async () => {
			const config = await import('../../source/config.js');
			expect(() => config.adoptRegion('eu')).toThrow(config.RetiredRegionError);
			for (const getter of URL_GETTERS) {
				expect(() => config[getter]()).toThrow(config.RetiredRegionError);
			}
		});

		it('adoptRegion accepts us and empty values', async () => {
			const config = await import('../../source/config.js');
			expect(config.adoptRegion('us')).toBe('us');
			expect(config.adoptRegion(null)).toBe('us');
			expect(config.adoptRegion(undefined)).toBe('us');
			expect(config.getPermitApiUrl()).toBe('https://api.permit.io');
		});

		it('setRegion("us") recovers from a retired region', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(() => config.getPermitApiUrl()).toThrow();
			config.setRegion('us');
			expect(config.getPermitApiUrl()).toBe('https://api.permit.io');
		});

		it('the error message tells the user to use the US region and log in again', async () => {
			const config = await import('../../source/config.js');
			expect(config.EU_REGION_RETIRED_MESSAGE).toContain('EU region');
			expect(config.EU_REGION_RETIRED_MESSAGE).toContain('US region');
			expect(config.EU_REGION_RETIRED_MESSAGE).toContain('permit login');
			expect(config.isRetiredRegion('eu')).toBe(true);
			expect(config.isRetiredRegion('us')).toBe(false);
			expect(config.isRetiredRegion(undefined)).toBe(false);
		});
	});
});

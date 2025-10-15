import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Config - Region Support', () => {
	// Reset modules before each test to ensure clean state
	beforeEach(async () => {
		vi.resetModules();
		delete process.env.PERMIT_REGION;
	});

	describe('Region Configuration', () => {
		it('should default to US region when no env var is set', async () => {
			const config = await import('../../source/config.js');
			expect(config.getRegion()).toBe('us');
		});

		it('should use EU region when PERMIT_REGION=eu is set', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getRegion()).toBe('eu');
		});

		it('should use US region when PERMIT_REGION=us is set', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getRegion()).toBe('us');
		});

		it('should allow setting region programmatically', async () => {
			const config = await import('../../source/config.js');
			config.setRegion('eu');
			expect(config.getRegion()).toBe('eu');
			config.setRegion('us');
			expect(config.getRegion()).toBe('us');
		});
	});

	describe('US Region URLs', () => {
		it('should return correct US API URL', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getPermitApiUrl()).toBe('https://api.permit.io');
		});

		it('should return correct US origin URL', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getPermitOriginUrl()).toBe('https://app.permit.io');
		});

		it('should return correct US auth domain', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getAuthPermitDomain()).toBe('app.permit.io');
		});

		it('should return correct US PDP URL', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getCloudPdpUrl()).toBe('https://cloudpdp.api.permit.io');
		});

		it('should return correct US statistics URL', async () => {
			process.env.PERMIT_REGION = 'us';
			const config = await import('../../source/config.js');
			expect(config.getPermitApiStatisticsUrl()).toBe(
				'https://pdp-statistics.api.permit.io/v2/stats',
			);
		});
	});

	describe('EU Region URLs', () => {
		it('should return correct EU API URL', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getPermitApiUrl()).toBe('https://api.eu.permit.io');
		});

		it('should return correct EU origin URL', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getPermitOriginUrl()).toBe('https://app.eu.permit.io');
		});

		it('should return correct EU auth domain', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getAuthPermitDomain()).toBe('app.eu.permit.io');
		});

		it('should return correct EU PDP URL', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getCloudPdpUrl()).toBe(
				'https://cloudpdp.api.eu-central-1.permit.io',
			);
		});

		it('should return correct EU statistics URL', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getPermitApiStatisticsUrl()).toBe(
				'https://pdp-statistics.api.eu-central-1.permit.io/v2/stats',
			);
		});
	});

	describe('Auth0 Configuration', () => {
		it('should use same Auth0 audience for all regions', async () => {
			// Test US
			process.env.PERMIT_REGION = 'us';
			const configUS = await import('../../source/config.js');
			const usAudience = configUS.AUTH0_AUDIENCE;

			vi.resetModules();
			delete process.env.PERMIT_REGION;

			// Test EU
			process.env.PERMIT_REGION = 'eu';
			const configEU = await import('../../source/config.js');
			const euAudience = configEU.AUTH0_AUDIENCE;

			expect(usAudience).toBe('https://api.permit.io/v1/');
			expect(euAudience).toBe('https://api.permit.io/v1/');
			expect(usAudience).toBe(euAudience);
		});

		it('should have correct Auth0 audience constant', async () => {
			const config = await import('../../source/config.js');
			expect(config.AUTH0_AUDIENCE).toBe('https://api.permit.io/v1/');
		});

		it('should have shared auth.permit.io URL', async () => {
			const config = await import('../../source/config.js');
			expect(config.AUTH_PERMIT_URL).toBe('https://auth.permit.io');
		});
	});

	describe('API URL Functions', () => {
		it('should return correct API URL for default region', async () => {
			const config = await import('../../source/config.js');
			expect(config.getApiUrl()).toBe('https://api.permit.io/v2/');
		});

		it('should return correct API URL for EU region', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getApiUrl()).toBe('https://api.eu.permit.io/v2/');
		});

		it('should return correct Facts API URL for US', async () => {
			const config = await import('../../source/config.js');
			expect(config.getFactsApiUrl()).toBe('https://api.permit.io/v2/facts/');
		});

		it('should return correct Facts API URL for EU', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getFactsApiUrl()).toBe(
				'https://api.eu.permit.io/v2/facts/',
			);
		});

		it('should return correct Auth API URL for US', async () => {
			const config = await import('../../source/config.js');
			expect(config.getAuthApiUrl()).toBe('https://api.permit.io/v1/');
		});

		it('should return correct Auth API URL for EU', async () => {
			process.env.PERMIT_REGION = 'eu';
			const config = await import('../../source/config.js');
			expect(config.getAuthApiUrl()).toBe('https://api.eu.permit.io/v1/');
		});
	});

	describe('Region Switching', () => {
		it('should update URLs when region is changed', async () => {
			const config = await import('../../source/config.js');

			// Start with US
			expect(config.getRegion()).toBe('us');
			expect(config.getPermitApiUrl()).toBe('https://api.permit.io');

			// Switch to EU
			config.setRegion('eu');
			expect(config.getRegion()).toBe('eu');
			expect(config.getPermitApiUrl()).toBe('https://api.eu.permit.io');
			expect(config.getCloudPdpUrl()).toBe(
				'https://cloudpdp.api.eu-central-1.permit.io',
			);

			// Switch back to US
			config.setRegion('us');
			expect(config.getRegion()).toBe('us');
			expect(config.getPermitApiUrl()).toBe('https://api.permit.io');
			expect(config.getCloudPdpUrl()).toBe('https://cloudpdp.api.permit.io');
		});

		it('should maintain Auth0 audience when switching regions', async () => {
			const config = await import('../../source/config.js');

			const initialAudience = config.AUTH0_AUDIENCE;
			config.setRegion('eu');
			const euAudience = config.AUTH0_AUDIENCE;
			config.setRegion('us');
			const usAudience = config.AUTH0_AUDIENCE;

			expect(initialAudience).toBe('https://api.permit.io/v1/');
			expect(euAudience).toBe('https://api.permit.io/v1/');
			expect(usAudience).toBe('https://api.permit.io/v1/');
		});
	});
});

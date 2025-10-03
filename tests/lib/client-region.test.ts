import { describe, it, expect, beforeEach, vi } from 'vitest';

let currentRegion: 'us' | 'eu' = 'us';

const getRegionSubdomain = (region: 'us' | 'eu'): string => {
	return region === 'eu' ? 'eu.' : '';
};

// Mock the config module
vi.mock('../../source/config.js', async () => {
	return {
		getPermitApiUrl: vi.fn(() => {
			const subdomain = getRegionSubdomain(currentRegion);
			return `https://api.${subdomain}permit.io`;
		}),
		getPermitOriginUrl: vi.fn(() => {
			const subdomain = getRegionSubdomain(currentRegion);
			return `https://app.${subdomain}permit.io`;
		}),
		getCloudPdpUrl: vi.fn(() => {
			if (currentRegion === 'eu') {
				return 'https://cloudpdp.api.eu-central-1.permit.io';
			}
			return 'https://cloudpdp.api.permit.io';
		}),
		setRegion: vi.fn((region: 'us' | 'eu') => {
			currentRegion = region;
		}),
		getRegion: vi.fn(() => currentRegion),
	};
});

// Mock React hooks
vi.mock('react', async () => {
	const React = await vi.importActual('react');
	return {
		...React,
		useCallback: fn => fn,
		useMemo: fn => fn(),
	};
});

// Mock openapi-fetch
vi.mock('openapi-fetch', () => ({
	default: vi.fn(config => {
		return {
			baseUrl: config.baseUrl,
			headers: config.headers,
			GET: vi.fn(),
			POST: vi.fn(),
			PUT: vi.fn(),
			PATCH: vi.fn(),
			DELETE: vi.fn(),
		};
	}),
}));

describe('useClient - Region Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentRegion = 'us';
	});

	describe('Region-Aware URL Functions', () => {
		it('should use correct API URL for US region', async () => {
			const { getPermitApiUrl } = await import('../../source/config.js');
			expect(getPermitApiUrl()).toBe('https://api.permit.io');
		});

		it('should use correct API URL for EU region', async () => {
			const { setRegion, getPermitApiUrl } = await import(
				'../../source/config.js'
			);
			setRegion('eu');
			expect(getPermitApiUrl()).toBe('https://api.eu.permit.io');
		});

		it('should use correct PDP URL for US region', async () => {
			const { getCloudPdpUrl } = await import('../../source/config.js');
			expect(getCloudPdpUrl()).toBe('https://cloudpdp.api.permit.io');
		});

		it('should use correct PDP URL for EU region', async () => {
			const { setRegion, getCloudPdpUrl } = await import(
				'../../source/config.js'
			);
			setRegion('eu');
			expect(getCloudPdpUrl()).toBe(
				'https://cloudpdp.api.eu-central-1.permit.io',
			);
		});

		it('should use correct Origin URL for US region', async () => {
			const { getPermitOriginUrl } = await import('../../source/config.js');
			expect(getPermitOriginUrl()).toBe('https://app.permit.io');
		});

		it('should use correct Origin URL for EU region', async () => {
			const { setRegion, getPermitOriginUrl } = await import(
				'../../source/config.js'
			);
			setRegion('eu');
			expect(getPermitOriginUrl()).toBe('https://app.eu.permit.io');
		});
	});

	describe('Region Switching', () => {
		it('should update URLs when switching from US to EU', async () => {
			const { setRegion, getPermitApiUrl, getCloudPdpUrl } = await import(
				'../../source/config.js'
			);

			// Start with US
			expect(getPermitApiUrl()).toBe('https://api.permit.io');
			expect(getCloudPdpUrl()).toBe('https://cloudpdp.api.permit.io');

			// Switch to EU
			setRegion('eu');
			expect(getPermitApiUrl()).toBe('https://api.eu.permit.io');
			expect(getCloudPdpUrl()).toBe(
				'https://cloudpdp.api.eu-central-1.permit.io',
			);
		});

		it('should update URLs when switching from EU to US', async () => {
			const { setRegion, getPermitApiUrl, getCloudPdpUrl } = await import(
				'../../source/config.js'
			);

			// Start with EU
			setRegion('eu');
			expect(getPermitApiUrl()).toBe('https://api.eu.permit.io');

			// Switch to US
			setRegion('us');
			expect(getPermitApiUrl()).toBe('https://api.permit.io');
			expect(getCloudPdpUrl()).toBe('https://cloudpdp.api.permit.io');
		});
	});
});

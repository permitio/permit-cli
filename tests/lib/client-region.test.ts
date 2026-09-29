import { describe, it, expect, vi, beforeEach } from 'vitest';
import createClient from 'openapi-fetch';

// Mock React hooks so useClient can be called outside a component
vi.mock('react', async () => {
	const React = await vi.importActual('react');
	return {
		...React,
		useCallback: (fn: unknown) => fn,
		useMemo: (fn: () => unknown) => fn(),
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

import useClient from '../../source/hooks/useClient.js';
import {
	RetiredRegionError,
	adoptRegion,
	setRegion,
} from '../../source/config.js';

describe('useClient - Region Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setRegion('us');
	});

	describe('US region', () => {
		it('builds the API client against the US API and origin', () => {
			useClient().authenticatedApiClient();
			expect(createClient).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: 'https://api.permit.io',
					headers: expect.objectContaining({
						Origin: 'https://app.permit.io',
					}),
				}),
			);
		});

		it('builds the PDP client against the US cloud PDP', () => {
			useClient().authenticatedPdpClient();
			expect(createClient).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: 'https://cloudpdp.api.permit.io',
				}),
			);
		});
	});

	describe('retired EU region', () => {
		beforeEach(() => {
			expect(() => adoptRegion('eu')).toThrow(RetiredRegionError);
		});

		it('refuses to build the API client instead of falling back to US', () => {
			expect(() => useClient().authenticatedApiClient()).toThrow(
				RetiredRegionError,
			);
			expect(createClient).not.toHaveBeenCalled();
		});

		it('refuses to build the default PDP client instead of falling back to US', () => {
			expect(() => useClient().authenticatedPdpClient()).toThrow(
				RetiredRegionError,
			);
			expect(createClient).not.toHaveBeenCalled();
		});

		it('refuses to build the unauthenticated API client', () => {
			expect(() =>
				useClient().unAuthenticatedApiClient('token', 'cookie'),
			).toThrow(RetiredRegionError);
			expect(createClient).not.toHaveBeenCalled();
		});
	});
});

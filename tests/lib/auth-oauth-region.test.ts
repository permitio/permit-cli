import { describe, it, expect, vi, beforeEach } from 'vitest';
import open from 'open';

// Mock dependencies
vi.mock('keytar', () => ({
	default: {
		getPassword: vi.fn(),
		setPassword: vi.fn(),
		deletePassword: vi.fn(),
	},
}));

vi.mock('open', () => ({
	default: vi.fn(),
}));

vi.mock('node:crypto', () => ({
	randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-verifier')),
	createHash: vi.fn().mockImplementation(() => ({
		update: vi.fn().mockReturnThis(),
		digest: vi.fn(() => Buffer.from('mock-hash')),
	})),
}));

vi.mock('http', () => ({
	createServer: vi.fn().mockReturnValue({
		listen: vi.fn(),
		close: vi.fn(),
	}),
}));

import * as auth from '../../source/lib/auth.js';

describe('Auth OAuth - Region Support', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('OAuth URL Generation', () => {
		it('should open browser with Auth0 URL for US region', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('us');

			await auth.browserAuth();

			expect(open).toHaveBeenCalledWith(
				expect.stringContaining('https://auth.permit.io/authorize'),
			);
		});

		it('should open browser with Auth0 URL for EU region', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('eu');

			await auth.browserAuth();

			expect(open).toHaveBeenCalledWith(
				expect.stringContaining('https://auth.permit.io/authorize'),
			);
		});

		it('should use same Auth0 audience for both US and EU regions', async () => {
			const { AUTH0_AUDIENCE } = await import('../../source/config.js');

			// Auth0 audience should be constant
			expect(AUTH0_AUDIENCE).toBe('https://api.permit.io/v1/');
		});

		it('should include correct domain parameter for US region', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('us');

			await auth.browserAuth();

			// Check that the URL contains the US domain
			const callArgs = (open as any).mock.calls[0][0];
			expect(callArgs).toContain('domain=app.permit.io');
		});

		it('should include correct domain parameter for EU region', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('eu');

			await auth.browserAuth();

			// Check that the URL contains the EU domain
			const callArgs = (open as any).mock.calls[0][0];
			expect(callArgs).toContain('domain=app.eu.permit.io');
		});

		it('should include shared Auth0 audience in OAuth parameters', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('eu');

			await auth.browserAuth();

			// Check that the URL contains the shared audience
			const callArgs = (open as any).mock.calls[0][0];
			expect(callArgs).toContain(
				'audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F',
			);
		});

		it('should include screen_hint with correct region domain', async () => {
			const { setRegion } = await import('../../source/config.js');
			setRegion('eu');

			await auth.browserAuth();

			const callArgs = (open as any).mock.calls[0][0];
			expect(callArgs).toContain('screen_hint=app.eu.permit.io');
		});
	});

	describe('OAuth Parameters Consistency', () => {
		it('should use consistent parameters across regions except domain', async () => {
			const { setRegion } = await import('../../source/config.js');

			// Test US
			setRegion('us');
			await auth.browserAuth();
			const usUrl = (open as any).mock.calls[0][0];

			vi.clearAllMocks();

			// Test EU
			setRegion('eu');
			await auth.browserAuth();
			const euUrl = (open as any).mock.calls[0][0];

			// Both should have same client_id
			expect(usUrl).toContain('client_id=Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1');
			expect(euUrl).toContain('client_id=Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1');

			// Both should have same audience (shared)
			expect(usUrl).toContain('audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F');
			expect(euUrl).toContain('audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F');

			// Both should have same redirect_uri
			expect(usUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A62419');
			expect(euUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A62419');

			// Both should have PKCE parameters
			expect(usUrl).toContain('code_challenge_method=S256');
			expect(euUrl).toContain('code_challenge_method=S256');
		});

		it('should only differ in domain and screen_hint between regions', async () => {
			const { setRegion } = await import('../../source/config.js');

			// Test US
			setRegion('us');
			await auth.browserAuth();
			const usUrl = (open as any).mock.calls[0][0];

			vi.clearAllMocks();

			// Test EU
			setRegion('eu');
			await auth.browserAuth();
			const euUrl = (open as any).mock.calls[0][0];

			// US should have US domain
			expect(usUrl).toContain('domain=app.permit.io');
			expect(usUrl).not.toContain('domain=app.eu.permit.io');

			// EU should have EU domain
			expect(euUrl).toContain('domain=app.eu.permit.io');
			expect(euUrl).not.toContain('domain=app.permit.io');
		});
	});

	describe('Critical Bug Fix Verification', () => {
		it('should NOT use region-specific API URL as Auth0 audience (bug fix)', async () => {
			const { setRegion } = await import('../../source/config.js');

			// The bug was using region-specific URL as audience
			// Correct behavior: use shared Auth0 audience
			setRegion('eu');
			await auth.browserAuth();

			const url = (open as any).mock.calls[0][0];

			// Should NOT contain EU-specific API URL as audience
			expect(url).not.toContain('audience=https%3A%2F%2Fapi.eu.permit.io');

			// Should contain shared audience
			expect(url).toContain('audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F');
		});

		it('should use shared Auth0 audience even when switching regions', async () => {
			const { setRegion } = await import('../../source/config.js');

			// Test multiple region switches
			const regions: Array<'us' | 'eu'> = ['us', 'eu', 'us', 'eu'];

			for (const region of regions) {
				setRegion(region);
				await auth.browserAuth();

				const url = (open as any).mock.calls[
					(open as any).mock.calls.length - 1
				][0];

				// Always use shared audience
				expect(url).toContain('audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F');

				// Never use region-specific API URL
				expect(url).not.toContain('audience=https%3A%2F%2Fapi.eu.permit.io');
			}
		});
	});
});

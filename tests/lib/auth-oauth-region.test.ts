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
	beforeEach(async () => {
		vi.clearAllMocks();
		const { setRegion } = await import('../../source/config.js');
		setRegion('us');
	});

	describe('US region', () => {
		it('should open browser with the Auth0 URL', async () => {
			await auth.browserAuth();

			expect(open).toHaveBeenCalledWith(
				expect.stringContaining('https://auth.permit.io/authorize'),
			);
		});

		it('should include the US domain and screen_hint', async () => {
			await auth.browserAuth();

			const callArgs = (open as any).mock.calls[0][0];
			expect(callArgs).toContain('domain=app.permit.io');
			expect(callArgs).toContain('screen_hint=app.permit.io');
		});

		it('should include the shared Auth0 audience and fixed OAuth parameters', async () => {
			await auth.browserAuth();

			const url = (open as any).mock.calls[0][0];
			expect(url).toContain('audience=https%3A%2F%2Fapi.permit.io%2Fv1%2F');
			expect(url).toContain('client_id=Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1');
			expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A62419');
			expect(url).toContain('code_challenge_method=S256');
		});
	});

	describe('retired EU region', () => {
		it('should reject browser login for eu without opening the browser', async () => {
			const { adoptRegion, RetiredRegionError } = await import(
				'../../source/config.js'
			);
			expect(() => adoptRegion('eu')).toThrow(RetiredRegionError);

			await expect(auth.browserAuth()).rejects.toThrow(RetiredRegionError);
			expect(open).not.toHaveBeenCalled();
		});
	});
});

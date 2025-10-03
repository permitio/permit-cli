import { describe, vi, it, expect } from 'vitest';
import * as auth from '../../source/lib/auth';
import * as http from 'http';
import {
	KEYSTORE_PERMIT_SERVICE_NAME,
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
} from '../../source/config';
import open from 'open';
import * as pkg from 'keytar';

// Mock dependencies
vi.mock('http', () => ({
	createServer: vi.fn().mockReturnValue({
		listen: vi.fn(),
		close: vi.fn(),
	}),
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

// Correct mock for 'keytar' using named exports
vi.mock('keytar', () => {
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(), // Mocked return value
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});

describe('Token Type', () => {
	it('Should return correct token type', async () => {
		const demoToken = 'permit_key_'.concat('a'.repeat(97));
		const tokenType = auth.tokenType(demoToken);
		expect(tokenType).toBe(auth.TokenType.APIToken);
	});

	it('Should return type of JWT', async () => {
		const demoJwtToken = 'demo1.demo2.demo3';
		const tokenType = auth.tokenType(demoJwtToken);
		expect(tokenType).toBe(auth.TokenType.AccessToken);
	});

	it('should return invalid token', async () => {
		const demoInvalidToken = 'invalid token';
		const tokenType = auth.tokenType(demoInvalidToken);
		expect(tokenType).toBe(auth.TokenType.Invalid);
	});
});

describe('Save Auth Token', () => {
	it('Should save token', async () => {
		const demoToken = 'permit_key_'.concat('a'.repeat(97));
		const { setPassword } = pkg;
		const result = await auth.saveAuthToken(demoToken);
		expect(setPassword).toBeCalledWith(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
			demoToken,
		);
		expect(result).toBe(''); // Ensure the result is empty as expected
	});

	it('Should return invalid token', async () => {
		const demoToken = 'invalid token';
		const result = await auth.saveAuthToken(demoToken);
		expect(result).toBe('Invalid auth token');
	});
});

describe('Load Auth Token', () => {
	it('Should load token', async () => {
		const demoToken = 'permit_key_'.concat('a'.repeat(97));
		await auth.saveAuthToken(demoToken); // Save token first
		const { getPassword } = pkg;
		(getPassword as any).mockResolvedValueOnce(
			'permit_key_a'.concat('a'.repeat(97)),
		);
		const result = await auth.loadAuthToken();
		expect(result).toBe('permit_key_a'.concat('a'.repeat(97))); // Mocked return value
	});

	it('Should throw error', async () => {
		const { deletePassword } = await import('keytar');
		await deletePassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
		);

		try {
			await auth.loadAuthToken();
		} catch (error) {
			expect(error).toBeInstanceOf(Error); // Expect an error when the token is not found
		}
	});
});

describe('Clean Auth Token', () => {
	it('Should clean token', async () => {
		const { getPassword } = pkg;
		await auth.cleanAuthToken();
		(getPassword as any).mockResolvedValueOnce(null);
		const result = await getPassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
		);
		expect(result).toBeNull(); // Expect null after cleaning the token
	});
});

describe('Browser Auth', () => {
	it('Should open browser', async () => {
		await auth.browserAuth();
		expect(open).toHaveBeenCalled(); // Ensure the browser opens
	});
});

describe('Region Support in Auth', () => {
	it('Should save region to keystore', async () => {
		const { setPassword } = pkg;
		await auth.saveRegion('eu');
		expect(setPassword).toHaveBeenCalledWith(
			'Permit.io',
			'PERMIT_REGION',
			'eu',
		);
	});

	it('Should load region from keystore', async () => {
		const { getPassword } = pkg;
		(getPassword as any).mockResolvedValueOnce('eu');
		const region = await auth.loadRegion();
		expect(region).toBe('eu');
		expect(getPassword).toHaveBeenCalledWith('Permit.io', 'PERMIT_REGION');
	});

	it('Should default to us region when no region is stored', async () => {
		const { getPassword } = pkg;
		(getPassword as any).mockResolvedValueOnce(null);
		const region = await auth.loadRegion();
		expect(region).toBe('us');
	});

	it('Should clean region when cleaning auth token', async () => {
		const { deletePassword } = pkg;
		await auth.cleanAuthToken();
		expect(deletePassword).toHaveBeenCalledWith('Permit.io', 'PERMIT_REGION');
	});
});

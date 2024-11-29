import { describe, vi, it, expect } from 'vitest';
import * as auth from '../../source/lib/auth';
import pkg from 'keytar';
import delay from 'delay';
import {
	KEYSTORE_PERMIT_SERVICE_NAME,
	DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
} from '../../source/config';
import http from 'http';
import open from 'open';
import { randomBytes, createHash } from 'crypto';

vi.mock('node:http', () => ({
	createServer: vi.fn(),
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

global.fetch = vi.fn();

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
		const result = await auth.saveAuthToken(demoToken);
		expect(result).toBe('');
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
		await auth.saveAuthToken(demoToken);
		const result = await auth.loadAuthToken();
		expect(result).toBe(demoToken);
	});
	it('Should throw error', async () => {
		await pkg.deletePassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
		);
		try {
			await auth.loadAuthToken();
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
		}
	});
});
describe('Clean Auth Token', () => {
	it('Should clean token', async () => {
		await auth.cleanAuthToken();
		const result = await pkg.getPassword(
			KEYSTORE_PERMIT_SERVICE_NAME,
			DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
		);
		expect(result).toBeNull();
	});
});

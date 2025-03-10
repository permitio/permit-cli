import { describe, vi, it, expect } from 'vitest';
import * as utils from '../../source/lib/gitops/utils.js';
import ssh from 'micro-key-producer/ssh.js';
import { randomBytes } from 'micro-key-producer/utils.js';
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));
vi.mock('micro-key-producer/ssh.js', () => ({
	default: vi.fn(),
}));
vi.mock('micro-key-producer/utils.js', () => ({
	randomBytes: vi.fn(),
}));


describe('generateSSHKey', () => {
	it('should generate an SSH key', () => {
		(randomBytes as any).mockReturnValueOnce(new Uint8Array(32));
		(ssh as any).mockReturnValueOnce({
			publicKeyBytes: new Uint8Array(8),
			publicKey: 'publicKey',
			privateKey: 'privateKey',
			fingerprint: 'testFingerprint',
		});
		const key = utils.generateSSHKey();
		expect(key).toStrictEqual({
			publicKeyBytes: new Uint8Array(8),
			publicKey: 'publicKey',
			privateKey: 'privateKey',
			fingerprint: 'testFingerprint',
		});
	});
});

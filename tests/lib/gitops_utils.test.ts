import { describe, vi, it, expect } from 'vitest';
import * as utils from '../../source/lib/gitops/utils';
import { apiCall } from '../../source/lib/api';
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

// describe('getProjectList', () => {
// 	it('should return a list of projects', async () => {
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 200,
// 			response: [
// 				{
// 					key: 'testKey',
// 					urn_namespace: 'testNamespace',
// 					id: 'testId',
// 					organization_id: 'testOrgId',
// 					created_at: 'testCreatedAt',
// 					updated_at: 'testUpdatedAt',
// 					name: 'testName',
// 				},
// 			],
// 		});
// 		const projects = await utils.getProjectList(
// 			'permit_key_'.concat('a'.repeat(96)),
// 		);
// 		expect(projects).toEqual([
// 			{
// 				key: 'testKey',
// 				urn_namespace: 'testNamespace',
// 				id: 'testId',
// 				organization_id: 'testOrgId',
// 				created_at: 'testCreatedAt',
// 				updated_at: 'testUpdatedAt',
// 				name: 'testName',
// 			},
// 		]);
// 	});
// 	it('should throw an error if the status is not 200', async () => {
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 400,
// 			response: 'testError',
// 		});
// 		await expect(
// 			utils.getProjectList('permit_key_'.concat('a'.repeat(96))),
// 		).rejects.toThrow('Failed to fetch projects: testError');
// 	});
// });
//
// describe('getRepoList', () => {
// 	it('should return a list of repos', async () => {
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 200,
// 			response: [
// 				{ status: 'valid', key: 'testKey' },
// 				{ status: 'invalid', key: 'testKey2' },
// 			],
// 		});
// 		const repos = await utils.getRepoList(
// 			'permit_key_'.concat('a'.repeat(96)),
// 			'testProjectKey',
// 		);
// 		expect(repos).toEqual([
// 			{ status: 'valid', key: 'testKey' },
// 			{ status: 'invalid', key: 'testKey2' },
// 		]);
// 	});
// });

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

// describe('Configure Permit', async () => {
// 	it('should configure permit', async () => {
// 		const gitconfig = {
// 			url: 'testUrl',
// 			mainBranchName: 'testMainBranchName',
// 			credentials: {
// 				authType: 'ssh',
// 				username: 'git',
// 				privateKey: 'privateKey',
// 			},
// 			key: 'testKey',
// 			activateWhenValidated: true,
// 		};
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 200,
// 			response: {
// 				id: 'testId',
// 				key: 'testKey',
// 				status: 'valid',
// 			},
// 		});
// 		const response = await utils.configurePermit(
// 			'permit_key_'.concat('a'.repeat(96)),
// 			'testProjectKey',
// 			gitconfig,
// 		);
// 		expect(response).toStrictEqual({
// 			id: 'testId',
// 			key: 'testKey',
// 			status: 'valid',
// 		});
// 	});
// 	it('should throw an error if the status is 422', async () => {
// 		const gitconfig = {
// 			url: 'testUrl',
// 			mainBranchName: 'testMainBranchName',
// 			credentials: {
// 				authType: 'ssh',
// 				username: 'git',
// 				privateKey: 'privateKey',
// 			},
// 			key: 'testKey',
// 			activateWhenValidated: true,
// 		};
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 422,
// 			response: {
// 				id: 'testId',
// 				key: 'testKey',
// 				status: 'valid',
// 			},
// 		});
// 		await expect(
// 			utils.configurePermit(
// 				'permit_key_'.concat('a'.repeat(96)),
// 				'testProjectKey',
// 				gitconfig,
// 			),
// 		).rejects.toThrow('Validation Error in Configuring Permit');
// 	});
// 	it('should throw an error if the status is not 200', async () => {
// 		const gitconfig = {
// 			url: 'testUrl',
// 			mainBranchName: 'testMainBranchName',
// 			credentials: {
// 				authType: 'ssh',
// 				username: 'git',
// 				privateKey: 'privateKey',
// 			},
// 			key: 'testKey',
// 			activateWhenValidated: true,
// 		};
// 		(apiCall as any).mockResolvedValueOnce({
// 			status: 400,
// 			response: {
// 				id: 'testId',
// 				key: 'testKey',
// 				status: 'valid',
// 			},
// 		});
// 		await expect(
// 			utils.configurePermit(
// 				'permit_key_'.concat('a'.repeat(96)),
// 				'testProjectKey',
// 				gitconfig,
// 			),
// 		).rejects.toThrow('Invalid Configuration ');
// 	});
// });

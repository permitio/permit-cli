import React from 'react';
import { render } from 'ink-testing-library';
import RepositoryKey from '../source/components/gitops/RepositoryKey.js';
import SSHKey from '../source/components/gitops/SSHKey.js';
import BranchName from '../source/components/gitops/BranchName.js';
import GitHub from '../source/commands/gitops/create/github.js';
import delay from 'delay';
import { vi, describe, it, expect } from 'vitest';
import { useProjectAPI } from '../source/hooks/useProjectAPI.js';
import { usePolicyGitReposApi } from '../source/hooks/usePolicyGitReposApi.js';
import * as keytar from 'keytar';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi';

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});


const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('clipboardy', () => ({
	default: {
		writeSync: vi.fn(),
	},
}));
vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});

vi.mock('../source/hooks/useProjectAPI.js', () => ({
	useProjectAPI: vi.fn(),
}));

vi.mock('../source/lib/gitops/utils.ts', () => (({
	generateSSHKey: vi.fn(() => ({
		publicKey:
			' ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYpTS7khEGR+PDWsNveNP6ffFNEhoRwrG0+DckrqaJT help@permit.io',
		privateKey:
			' ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYpTS7khEGR+PDWsNveNP6ffFNEhoRwrG0+DckrqaJT help@permit.io',
	})),
})));



vi.mock('../source/hooks/usePolicyGitReposApi.js', () => ({
	usePolicyGitReposApi: vi.fn(() => ({
		getRepoList: vi.fn(),
		configurePermit: vi.fn()
	})),
}));

vi.mock('../source/hooks/useApiKeyApi', async() => {
	const original = await vi.importActual('../source/hooks/useApiKeyApi');

	return {
		...original,
		useApiKeyApi: () => ({
			getApiKeyScope: vi.fn().mockResolvedValue({
				data: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
				status: 200,
			}),
			getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
				data: { secret: 'test-secret' },
				error: null,
			}),
			validateApiKeyScope: vi.fn().mockResolvedValue({
				valid: true,
				scope: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
			}),
		}),
	};
});

const enter = '\r';
const arrowUp = '\u001B[A';
const arrowDown = '\u001B[B';

describe('RepositoryKey  Component', () => {
	it('should call onRepoKeySubmit with the correct value', async () => {

		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			}))
		})

		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);
		await delay(100);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = 'repo3';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		//
		expect(onRepoKeySubmit).toHaveBeenCalledOnce();
	});
	it("should call onError", async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			}))
		})
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);
		await delay(100);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = '';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
	});
	it('Invalid RepoKey Error ', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			}))
		})
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);

		await delay(100);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = 'Invalid RepoKey';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
	});
	it('Existing repoKey name', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			}))
		})
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = 'repo1';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(100);

		expect(onError).toHaveBeenCalledOnce();
	});
});

describe('SSHKey Component', () => {
	it('should call onSSHKeySubmit with the correct value', async () => {
		const onSSHKeySubmit = vi.fn();
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const onError = vi.fn();
		const { stdin, lastFrame } = render(
			<SSHKey onSSHKeySubmit={onSSHKeySubmit} onError={onError} />,
		);
		const frameString = lastFrame()?.toString() ?? '';

		// Assertion
		expect(frameString).toMatch(/SSH Key Generated./);
		expect(frameString).toMatch(/Copy The Public Key to Github:/);

		const sshUrl = 'git@github.com:user/repository.git';
		await delay(50);
		stdin.write(sshUrl);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onSSHKeySubmit).toHaveBeenCalledOnce();
		expect(onSSHKeySubmit).toHaveBeenCalledWith(
			expect.stringMatching(
				/ssh-(ed25519|rsa|ecdsa-sha2-[a-z0-9-]+) [A-Za-z0-9+/=]+ [\w.@+-]+/,
			),
			sshUrl,
		);
	});
	it("should call onError with 'Please enter a valid SSH URL' for empty value", async () => {
		const onSSHKeySubmit = vi.fn();
		const onError = vi.fn();
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<SSHKey onSSHKeySubmit={onSSHKeySubmit} onError={onError} />,
		);
		const frameString = lastFrame()?.toString() ?? '';

		// Assertion
		expect(frameString).toMatch(/SSH Key Generated./);
		expect(frameString).toMatch(/Copy The Public Key to Github:/);

		const sshUrl = '';
		await delay(50);
		stdin.write(sshUrl);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Please enter a valid SSH URL');
	});
	it("should call onError with 'Please enter a valid SSH URL' for invalid value", async () => {
		const onSSHKeySubmit = vi.fn();
		const onError = vi.fn();
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<SSHKey onSSHKeySubmit={onSSHKeySubmit} onError={onError} />,
		);
		const frameString = lastFrame()?.toString() ?? '';

		// Assertion
		expect(frameString).toMatch(/SSH Key Generated./);
		expect(frameString).toMatch(/Copy The Public Key to Github:/);

		const sshUrl = 'invalid_url';
		await delay(50);
		stdin.write(sshUrl);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Please enter a valid SSH URL');
	});
});

describe('Branch Name component', () => {
	it('should call onBranchSubmit with the correct value', async () => {
		const onBranchSubmit = vi.fn();
		const onError = vi.fn();
		const { stdin, lastFrame } = render(
			<BranchName onBranchSubmit={onBranchSubmit} onError={onError} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter the Branch Name:/);
		const branchName = 'branch1';
		await delay(50);
		stdin.write(branchName);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onBranchSubmit).toHaveBeenCalledOnce();
		expect(onBranchSubmit).toHaveBeenCalledWith(branchName);
	});
	it("should call onError with 'Please enter a valid branch name' for empty value", async () => {
		const onBranchSubmit = vi.fn();
		const onError = vi.fn();
		const { stdin, lastFrame } = render(
			<BranchName onBranchSubmit={onBranchSubmit} onError={onError} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter the Branch Name:/);
		const branchName = '';
		await delay(50);
		stdin.write(branchName);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Please enter a valid branch name');
	});
});

describe('GitHub Complete Flow', () => {
	it('should complete the flow', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			})),
			configurePermit: vi.fn(() => Promise.resolve({

					data: {status: 'valid'},
					error: null,
					status: 200,

			}))
		})
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<GitHub options={{ apiKey: demoPermitKey }} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()?.toString()).toMatch(
			/GitOps Configuration Wizard - GitHub/,
		);
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Enter Your RepositoryKey :/);
		await delay(50);
		stdin.write('repo3');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/SSH Key Generated./);
		await delay(50);
		stdin.write('git@github.com:user/repository.git');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Enter the Branch Name:/);
		await delay(50);
		stdin.write('main');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			/Your GitOps is configured successfully and will be activated once validated/,
		);
	});
	it('should call without value for the props', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			})),
			configurePermit: vi.fn(() => Promise.resolve({

				data: {status: 'valid'},
				error: null,
				status: 200,

			}))

		})
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<GitHub options={{ apiKey: undefined }} />,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/GitOps Configuration Wizard - GitHub/);
	});
	it('should display Error message for invalid status of the repo', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			})),
			configurePermit: vi.fn(() => Promise.resolve({

				data: {status: 'invalid'},
				error: null,
				status: 200,

			}))
		})
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});

		const { stdin, lastFrame } = render(
			<GitHub options={{ apiKey: demoPermitKey }} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			/GitOps Configuration Wizard - GitHub/,
		);
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Enter Your RepositoryKey :/);
		await delay(50);
		stdin.write('repo3');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/SSH Key Generated./);
		await delay(50);
		stdin.write('git@github.com:user/repository.git');
		await delay(50);
		stdin.write(enter);
		expect(lastFrame()?.toString()).toMatch(/Enter the Branch Name:/);
		await delay(50);
		stdin.write('main');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			'Invalid configuration. Please check the configuration and try again.',
		);
	});
	it('should work with inactive argument', async () => {
		vi.mocked(usePolicyGitReposApi).mockReturnValue({
			getRepoList: vi.fn(() => Promise.resolve({
				data: [
					{ status: 'active', apiKey: 'repo1' },
					{ status: 'active', apiKey: 'repo2' },
				],
				error: null,
				status: 200
			})),
			configurePermit: vi.fn(() => Promise.resolve({

				data: {status: 'valid'},
				error: null,
				status: 200,

			}))
		})
		const mockGetProjects = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				],
				error: null,
			}),
		);
		(useProjectAPI as ReturnType<typeof vi.fn>).mockReturnValue({
			getProjects: mockGetProjects,
		});
		const { stdin, lastFrame } = render(
			<GitHub options={{ apiKey: demoPermitKey, inactive: true }} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()?.toString()).toMatch(
			/GitOps Configuration Wizard - GitHub/,
		);
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Enter Your RepositoryKey :/);
		await delay(50);
		stdin.write('repo3');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/SSH Key Generated./);
		await delay(50);
		stdin.write('git@github.com:user/repository.git');
		await delay(50);
		stdin.write(enter);
		expect(lastFrame()?.toString()).toMatch(/Enter the Branch Name:/);
		await delay(50);
		stdin.write('main');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			/Your GitOps is configured succesffuly. To complete the setup, remember to activate it later/,
		);
	});
});

import React from 'react';
import { render } from 'ink-testing-library';
import SelectProject from '../source/components/gitops/SelectProject.js';
import RepositoryKey from '../source/components/gitops/RepositoryKey.js';
import SSHKey from '../source/components/gitops/SSHKey.js';
import BranchName from '../source/components/gitops/BranchName.js';
import GitHub from '../source/commands/gitops/create/github.js';
import delay from 'delay';
import { vi, describe, it, expect } from 'vitest';
import {
	configurePermit,
	generateSSHKey,
	getProjectList,
	getRepoList,
} from '../source/lib/gitops/utils.js';
import { loadAuthToken } from '../source/lib/auth.js';
const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

vi.mock('clipboardy', () => ({
	default: {
		writeSync: vi.fn(),
	},
}));
vi.mock('../source/lib/auth.js', () => ({
	loadAuthToken: vi.fn(() => demoPermitKey),
}));
vi.mock('../source/lib/gitops/utils.js', () => ({
	getProjectList: vi.fn(() =>
		Promise.resolve([
			{ id: 1, name: 'Project 1', key: 'proj1' },
			{ id: 2, name: 'Project 2', key: 'proj2' },
		]),
	),
	getRepoList: vi.fn(() =>
		Promise.resolve([
			{ status: 'active', key: 'repo1' },
			{ status: 'active', key: 'repo2' },
		]),
	),
	generateSSHKey: vi.fn(() => ({
		publicKey:
			' ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYpTS7khEGR+PDWsNveNP6ffFNEhoRwrG0+DckrqaJT help@permit.io',
		privateKey:
			' ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYpTS7khEGR+PDWsNveNP6ffFNEhoRwrG0+DckrqaJT help@permit.io',
	})),
	activateRepo: vi.fn(() => Promise.resolve(true)),
	configurePermit: vi.fn(() =>
		Promise.resolve({ id: '1', status: 'active', key: 'repo1' }),
	),
}));

const enter = '\r';
const arrowUp = '\u001B[A';
const arrowDown = '\u001B[B';
describe('Select Project Component', () => {
	it('should display loading message when projects are being loaded', async () => {
		const onProjectSubmit = vi.fn();
		const onError = vi.fn();
		const accessKey = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<SelectProject
				apiKey={accessKey}
				onProjectSubmit={onProjectSubmit}
				onError={onError}
			/>,
		);

		// Assertion
		expect(lastFrame()?.toString() ?? '').toMatch(/Loading projects.../);
	});

	it('Should display project after loading', async () => {
		const onProjectSubmit = vi.fn();
		const onError = vi.fn();
		const accessKey = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<SelectProject
				apiKey={accessKey}
				onProjectSubmit={onProjectSubmit}
				onError={onError}
			/>,
		);

		// Check that the loading message is displayed
		expect(lastFrame()?.toString() ?? '').toMatch(/Loading projects.../);

		// Wait for the mocked getProjectList to resolve and display the projects
		await delay(50); // Adjust time depending on the delay for fetching projects

		// Optionally: Check that the project names are displayed
		expect(lastFrame()?.toString()).toMatch(/Project 1/);
		expect(lastFrame()?.toString()).toMatch(/Project 2/);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onProjectSubmit).toHaveBeenCalledOnce();
		expect(onProjectSubmit).toHaveBeenCalledWith('proj2');
	});
	it('should display an error message when fetching projects fails', async () => {
		const onProjectSubmit = vi.fn();
		const onError = vi.fn();
		const accessKey = 'permit_key_'.concat('a'.repeat(97));

		// Mock error response
		(getProjectList as any).mockRejectedValueOnce(
			new Error('Failed to fetch projects'),
		);

		const { stdin, lastFrame } = render(
			<SelectProject
				apiKey={accessKey}
				onProjectSubmit={onProjectSubmit}
				onError={onError}
			/>,
		);

		// Initially, check for loading message
		expect(lastFrame()?.toString()).toMatch(/Loading projects.../);

		// Wait for the error to be handled
		await delay(50); // Adjust delay as needed
		expect(onError).toHaveBeenCalledWith('Failed to fetch projects');
	});
});

describe('RepositoryKey  Component', () => {
	it('should call onRepoKeySubmit with the correct value', async () => {
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				apiKey={accessToken}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = 'repo3';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onRepoKeySubmit).toHaveBeenCalledOnce();
		expect(onRepoKeySubmit).toHaveBeenCalledWith(repoKey);
	});
	it("should call onError with 'RepoKey is required' for empty value", async () => {
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				apiKey={accessToken}
				onRepoKeySubmit={onRepoKeySubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const repoKey = '';
		await delay(50);
		stdin.write(repoKey);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Repository Key is required');
	});
	it('Invalid RepoKey Error ', async () => {
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				apiKey={accessToken}
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
		expect(onError).toHaveBeenCalledWith(
			'Repository Key should contain only alphanumeric characters, hyphens and underscores',
		);
	});
	it('Existing repoKey name', async () => {
		const onRepoKeySubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<RepositoryKey
				projectName={projectName}
				apiKey={accessToken}
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
		expect(onError).toHaveBeenCalledWith(
			'RepositoryKey with this name already exists',
		);
	});
});

describe('SSHKey Component', () => {
	it('should call onSSHKeySubmit with the correct value', async () => {
		const onSSHKeySubmit = vi.fn();
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

describe('GiHub Complete Flow', () => {
	it('should complete the flow', async () => {
		const { stdin, lastFrame } = render(
			<GitHub options={{ key: demoPermitKey }} />,
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
			/Your GitOps is configured successfully and will be activated once validated/,
		);
	});
	it('should call without value for the props', async () => {
		const { stdin, lastFrame } = render(
			<GitHub options={{ key: undefined }} />,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/GitOps Configuration Wizard - GitHub/);
	});
	it('should display Error message for invalid status of the repo', async () => {
		(configurePermit as any).mockResolvedValueOnce({
			id: '1',
			status: 'invalid',
			key: 'repo3',
		});
		const { stdin, lastFrame } = render(
			<GitHub options={{ key: demoPermitKey }} />,
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
		const { stdin, lastFrame } = render(
			<GitHub options={{ key: demoPermitKey, inactive: true }} />,
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

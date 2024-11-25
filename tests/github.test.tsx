import React from 'react';
import { render } from 'ink-testing-library';
import SelectProject from '../source/components/gitops/SelectProject.js';
import PolicyName from '../source/components/gitops/RepositoryKey.js';
import SSHKey from '../source/components/gitops/SSHKey.js';
import BranchName from '../source/components/gitops/BranchName.js';
import Activate from '../source/components/gitops/Activate.js';
import GitHub from '../source/commands/gitops/create/github.js';
import delay from 'delay';
import { vi, describe, it, expect } from 'vitest';
import {
	activateRepo,
	configurePermit,
	generateSSHKey,
	getProjectList,
	getRepoList,
} from '../source/lib/gitops/utils.js';
const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
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
				accessToken={accessKey}
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
				accessToken={accessKey}
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
		getProjectList.mockRejectedValueOnce(new Error('Failed to fetch projects'));

		const { stdin, lastFrame } = render(
			<SelectProject
				accessToken={accessKey}
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

describe('Policy Name Component', () => {
	it('should call onPolicyNameSubmit with the correct value', async () => {
		const onPolicyNameSubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<PolicyName
				projectName={projectName}
				accessToken={accessToken}
				onRepoKeySubmit={onPolicyNameSubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const policyName = 'policy1';
		await delay(50);
		stdin.write(policyName);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onPolicyNameSubmit).toHaveBeenCalledOnce();
		expect(onPolicyNameSubmit).toHaveBeenCalledWith(policyName);
	});
	it("should call onError with 'Policy Name is required' for empty value", async () => {
		const onPolicyNameSubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<PolicyName
				projectName={projectName}
				accessToken={accessToken}
				onRepoKeySubmit={onPolicyNameSubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const policyName = '';
		await delay(50);
		stdin.write(policyName);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Repository Key is required');
	});
	it('Invalid Policy Name  Error ', async () => {
		const onPolicyNameSubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<PolicyName
				projectName={projectName}
				accessToken={accessToken}
				onRepoKeySubmit={onPolicyNameSubmit}
				onError={onError}
			/>,
		);

		await delay(100);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const policyName = 'Invalid Policy Name';
		await delay(50);
		stdin.write(policyName);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(
			'Repository Key should contain only alphanumeric characters, hyphens and underscores',
		);
	});
	it('Existing policy name', async () => {
		const onPolicyNameSubmit = vi.fn();
		const onError = vi.fn();
		const projectName = 'project1';
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const { stdin, lastFrame } = render(
			<PolicyName
				projectName={projectName}
				accessToken={accessToken}
				onRepoKeySubmit={onPolicyNameSubmit}
				onError={onError}
			/>,
		);
		await delay(50);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Enter Your RepositoryKey :/);
		const policyName = 'repo1';
		await delay(50);
		stdin.write(policyName);
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

describe('Activate Component', () => {
	it('should call onActivate with the correct value', async () => {
		const onActivate = vi.fn();
		const onError = vi.fn();
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const projectKey = 'proj1';
		const gitConfig = {
			url: 'git@example.com/proj1.git',
			main_branch_name: 'main',
			credentials: {
				auth_type: 'ssh',
				username: 'git',
				private_key: 'private_key',
			},
			key: 'policy1',
		};
		const { stdin, lastFrame } = render(
			<Activate
				apiKey={accessToken}
				projectKey={projectKey}
				repoKey="repo1"
				onActivate={onActivate}
				onError={onError}
			/>,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Do you want to activate the repository?/);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onActivate).toHaveBeenCalledOnce();
		expect(onActivate).toHaveBeenCalledWith(true);
	});
	it("should call onError with 'Invalid Repo Status' for incorrect value", async () => {
		const onActivate = vi.fn();
		const onError = vi.fn();
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const projectKey = 'proj1';
		const gitConfig = {
			url: 'git@example.com/proj1.git',
			main_branch_name: 'main',
			credentials: {
				auth_type: 'ssh',
				username: 'git',
				private_key: 'private_key',
			},
			key: 'policy1',
		};
		activateRepo.mockRejectedValueOnce(new Error('Invalid Repo Status'));
		const { stdin, lastFrame } = render(
			<Activate
				apiKey={accessToken}
				projectKey={projectKey}
				repoKey="repo1"
				onActivate={onActivate}
				onError={onError}
			/>,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Do you want to activate the repository?/);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith('Invalid Repo Status');
	});

	it('activate value false', async () => {
		const onActivate = vi.fn();
		const onError = vi.fn();
		const accessToken = 'permit_key_'.concat('a'.repeat(97));
		const projectKey = 'proj1';
		const gitConfig = {
			url: 'git@example.com/proj1.git',
			main_branch_name: 'main',
			credentials: {
				auth_type: 'ssh',
				username: 'git',
				private_key: 'private_key',
			},
			key: 'policy1',
		};
		const { stdin, lastFrame } = render(
			<Activate
				apiKey={accessToken}
				projectKey={projectKey}
				repoKey="repo1"
				onActivate={onActivate}
				onError={onError}
			/>,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/Do you want to activate the repository?/);
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(onActivate).toHaveBeenCalledOnce();
		expect(onActivate).toHaveBeenCalledWith(false);
	});
});

describe('GiHub Complete Flow', () => {
	it('should complete the flow', async () => {
		const { stdin, lastFrame } = render(
			<GitHub options={{ key: demoPermitKey }} />,
		);
		const frameString = lastFrame()?.toString() ?? '';
		expect(frameString).toMatch(/GitOps Configuration Wizard - GitHub/);
		await delay(50);
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(/Enter Your RepositoryKey :/);
		await delay(50);
		stdin.write('policy1');
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
			/Do you want to activate the repository?/,
		);
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()?.toString()).toMatch(
			/Your GitOps is configured and activated sucessfully/,
		);
	});
});

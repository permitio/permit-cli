import React from 'react';
import { render } from 'ink-testing-library';
import { AuthProvider, useAuth } from '../../source/components/AuthProvider.js';
import { authCallbackServer, browserAuth, loadAuthToken } from '../../source/lib/auth.js';
import { describe, it, expect, vi } from 'vitest';
import { Text } from 'ink';
import delay from 'delay';
import * as keytar from "keytar"


const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

global.fetch = vi.fn();

vi.mock('../../source/lib/auth.js', async () => {
	const original = await vi.importActual('../../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(),
		browserAuth: vi.fn(),
		authCallbackServer: vi.fn(),
	};
});

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(demoPermitKey),
		getPassword: vi.fn().mockResolvedValue(demoPermitKey),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),

	};
	return { ...keytar, default: keytar };
});
const enter = '\r';

describe('AuthProvider', () => {
	it('should display loading text while loading token', async () => {
		(loadAuthToken as any).mockResolvedValueOnce(new Promise(() => {}));

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		expect(lastFrame()).toContain('Loading Token');
	});

	it('should display children when token is loaded successfully', async () => {
		(loadAuthToken as any).mockResolvedValue(demoPermitKey);
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				environment_id: 'env1',
				project_id: 'proj1',
				organization_id: 'org1',
			}),
			status: 200
		});

		const { lastFrame } = render(
			<AuthProvider>
				<Text>Child Component</Text>
			</AuthProvider>,
		);

		await delay(500);
		expect(lastFrame()).toContain('Child Component');
	});

	it('should throw an error when useAuth is called outside of AuthProvider', () => {
		const ChildComponent = () => {
			let apiKey: string;
			try {
				const { authToken } = useAuth();
				apiKey = authToken;
			} catch (error) {
				return <Text>useAuth must be used within an AuthProvider</Text>;
			}
			return <Text>{apiKey || 'No token'}</Text>;
		};
		const { lastFrame } = render(<ChildComponent />);
		expect(lastFrame()).toContain(
			'useAuth must be used within an AuthProvider',
		);
	});

	it('should display project if scope is project or greater', async () => {
		(loadAuthToken as any).mockRejectedValue(
			new Error('Failed to load token'),
		);
		vi.mocked(browserAuth).mockResolvedValue('verifier');
		vi.mocked(authCallbackServer).mockResolvedValue('browser_token');
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: {
				getSetCookie: () => ['cookie_value'],
			},
			json: async () => ({}),
			error: null,
		}).mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ([
					{ id: 'org1', name: 'Organization 1' },
					{ id: 'org2', name: 'Organization 2' },
				]
			)
		}).mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: {
				getSetCookie: () => ['cookie_value'],
			},
			json: async () => ({}),
			error: null,
		}).mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ([
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				]
			)
		}).mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ({
					data: [
						{id: 'mock-id'}
					]
				}
			)
		}).mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ({
					secret: "secret",
					project_id: "proj_id",
					organization_id: "organization_id",
				}
			)
		})
		const {stdin, lastFrame } = render(
			<AuthProvider scope={'project'}>
				<Text>Child Component</Text>
			</AuthProvider>,
		);
		await delay(500);
		expect(lastFrame()).toContain('Select an organization');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()).toContain('Select a project');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()).toContain('Child Component');
	});

	it('should display project if scope is environment', async () => {
		(loadAuthToken as any).mockRejectedValue(
			new Error('Failed to load token'),
		);
		vi.mocked(browserAuth).mockResolvedValue('verifier');
		vi.mocked(authCallbackServer).mockResolvedValue('browser_token');
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: {
				getSetCookie: () => ['cookie_value'],
			},
			json: async () => ({}),
			error: null,
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ([
					{ id: 'org1', name: 'Organization 1' },
					{ id: 'org2', name: 'Organization 2' },
				]
			)
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			headers: {
				getSetCookie: () => ['cookie_value'],
			},
			json: async () => ({}),
			error: null,
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ([
					{ id: 'proj1', name: 'Project 1' },
					{ id: 'proj2', name: 'Project 2' },
				]
			)
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ([
					{ id: 'env1', name: 'Env 1' },
					{ id: 'env2', name: 'Env 2' },
				]
			)
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ({
					secret: 'super-secret'
				}
			)
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ({
					data: [
						{id: 'mock-id'}
					]
				}
			)
		})
			.mockResolvedValueOnce({
			ok: true,
			status: 200,
			error: null,
			json: async () => ({
					secret: "secret",
					project_id: "proj_id",
					organization_id: "organization_id_",
				}
			)
		})
		const {stdin, lastFrame } = render(
			<AuthProvider scope={'environment'}>
				<Text>Child Component</Text>
			</AuthProvider>,
		);
		await delay(500);
		expect(lastFrame()).toContain('Select an organization');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()).toContain('Select a project');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()).toContain('Select an environment');
		await delay(50);
		stdin.write(enter);
		await delay(50);
		expect(lastFrame()).toContain('Child Component');
	});
});

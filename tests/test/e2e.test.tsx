import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRolesApi } from '../../source/hooks/useRolesApi.js';
import { useTenantApi } from '../../source/hooks/useTenantApi.js';
import { useResourcesApi } from '../../source/hooks/useResourcesApi.js';
import { useUserApi } from '../../source/hooks/useUserApi.js';
import delay from 'delay';
import { GeneratePolicySnapshot } from '../../source/components/test/GeneratePolicySnapshot.js';

vi.mock('../../source/hooks/useRolesApi.js', () => ({
	useRolesApi: vi.fn(),
}));

vi.mock('../../source/hooks/useTenantApi.js', () => ({
	useTenantApi: vi.fn(),
}));

vi.mock('../../source/hooks/useResourcesApi.js', () => ({
	useResourcesApi: vi.fn(),
}));

vi.mock('../../source/hooks/useUserApi.js', () => ({
	useUserApi: vi.fn(),
}));

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(process, 'exit').mockImplementation(code => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GeneratePolicySnapshot', () => {
	it('should complete dry run flow successfully', async () => {
		vi.mocked(useRolesApi).mockReturnValue({
			getRoles: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							key: 'role-1',
							name: 'Admin',
							permissions: ['res1:read', 'res1:write'],
						},
					],
				}),
			),
		});

		vi.mocked(useTenantApi).mockReturnValue({
			createTenant: vi.fn(() => Promise.resolve({ error: null })),
		});

		vi.mocked(useResourcesApi).mockReturnValue({
			getResources: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							key: 'res1',
							actions: {
								read: { key: 'read' },
								write: { key: 'write' },
							},
						},
					],
				}),
			),
		});

		vi.mocked(useUserApi).mockReturnValue({
			createUser: vi.fn(() => Promise.resolve({ error: null })),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot dryRun models={['RBAC']} />,
		);

		await delay(100); // Allow steps to process

		expect(lastFrame()).toMatch(/Roles found: 1/);
		expect(lastFrame()).toMatch(/Created a new test tenant/);
		expect(lastFrame()).toMatch(/Dry run mode!/);
		await delay(1100);
		expect(process.exit).toHaveBeenCalledWith(1); // Done or error triggers exit
	}, 2000);

	it('should complete non-dry run and save to path', async () => {
		vi.mocked(useRolesApi).mockReturnValue({
			getRoles: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							key: 'role-1',
							name: 'Admin',
							permissions: ['res1:read'],
						},
					],
				}),
			),
		});

		vi.mocked(useTenantApi).mockReturnValue({
			createTenant: vi.fn(() => Promise.resolve({ error: null })),
		});

		vi.mocked(useResourcesApi).mockReturnValue({
			getResources: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							key: 'res1',
							actions: {
								read: { key: 'read' },
							},
						},
					],
				}),
			),
		});

		vi.mocked(useUserApi).mockReturnValue({
			createUser: vi.fn(() => Promise.resolve({ error: null })),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot
				dryRun={false}
				models={['RBAC']}
				path="./test-output/config.json"
			/>,
		);

		await delay(100); // Wait for config to be written

		expect(lastFrame()).toMatch(/Config saved to .*test-output/);
		expect(process.exit).toHaveBeenCalledWith(1);
	});
});

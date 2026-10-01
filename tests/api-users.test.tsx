import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, it, expect, afterEach, beforeEach } from 'vitest';
import delay from 'delay';
import List from '../source/commands/api/users/list.js';
import { useApiKeyApi } from '../source/hooks/useApiKeyApi.js';
import Assign from '../source/commands/api/users/assign.js';
import Unassign from '../source/commands/api/users/unassign.js';

const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

global.fetch = vi.fn();
vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));
	const keytar = {
		setPassword: vi.fn(),
		getPassword: vi.fn(),
		deletePassword: vi.fn(),
	};
	return { ...keytar, default: keytar };
});

vi.mock('../source/hooks/useApiKeyApi', async () => {
	const original = await vi.importActual('../source/hooks/useApiKeyApi');

	return {
		...original,
		useApiKeyApi: () => ({
			getApiKeyScope: vi.fn().mockResolvedValue({
				response: {
					environment_id: 'env1',
					project_id: 'proj1',
					organization_id: 'org1',
				},
				error: null,
				status: 200,
			}),
			getProjectEnvironmentApiKey: vi.fn().mockResolvedValue({
				response: { secret: 'test-secret' },
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

vi.mock('../source/lib/auth.js', async () => {
	const original = await vi.importActual('../source/lib/auth.js');
	return {
		...original,
		loadAuthToken: vi.fn(() => demoPermitKey),
	};
});

describe('API Users List Command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render users list successfully', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({
				success: true,
				data: [
					{
						key: 'user1',
						email: 'test@test.com',
						first_name: 'Test',
						last_name: 'User',
						roles: [],
					},
				],
				total_count: 1,
				page: 1,
			}),
		});

		// vi.mocked(useApiKeyApi).mockReturnValue({
		// 	validateApiKeyScope: vi.fn(() =>
		// 		Promise.resolve({
		// 			valid: true,
		// 			scope: {
		// 				project_id: 'proj1',
		// 				environment_id: 'env1',
		// 				organization_id: 'org1',
		// 			},
		// 			error: null,
		// 		}),
		// 	),
		// 	getProjectEnvironmentApiKey: vi.fn(),
		// 	getApiKeyScope: vi.fn(),
		// 	getApiKeyList: vi.fn(),
		// 	getApiKeyById: vi.fn(),
		// 	validateApiKey: vi.fn(),
		// 	createApiKey: vi.fn(),
		// });

		const options = {
			apiKey: demoPermitKey,
			page: 1,
			perPage: 10,
			all: false,
			expandKey: false,
		};

		const { lastFrame } = render(<List options={options} />);
		expect(lastFrame()?.toString()).toMatch(/Loading Token/);

		await delay(100);
		expect(lastFrame()).toMatch(/Showing 1 items/);
	});

	it('should handle fetch errors', async () => {
		(fetch as any).mockResolvedValue({
			ok: false,
			text: async () => 'Failed to fetch users',
		});

		// vi.mocked(useApiKeyApi).mockReturnValue({
		// 	validateApiKeyScope: vi.fn(() =>
		// 		Promise.resolve({
		// 			valid: true,
		// 			scope: {
		// 				project_id: 'proj1',
		// 				environment_id: 'env1',
		// 				organization_id: 'org1',
		// 			},
		// 			error: null,
		// 		}),
		// 	),
		// 	getProjectEnvironmentApiKey: vi.fn(),
		// 	getApiKeyScope: vi.fn(),
		// 	getApiKeyList: vi.fn(),
		// 	getApiKeyById: vi.fn(),
		// 	validateApiKey: vi.fn(),
		// 	createApiKey: vi.fn(),
		// });

		const options = {
			apiKey: demoPermitKey,
			page: 1,
			perPage: 10,
			all: false,
			expandKey: false,
		};

		const { lastFrame } = render(<List options={options} />);
		expect(lastFrame()?.toString()).toMatch(/Loading Token/);
		await delay(100);
		expect(lastFrame()?.toString()).toMatch(/Error/);
	});

	it('should include resource instance roles when option is set', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({
				success: true,
				data: [
					{
						key: 'user1',
						email: 'test@test.com',
						first_name: 'Test',
						last_name: 'User',
						roles: [
							{
								role: 'admin',
								tenant: 'tenant1',
								resource_instance: {
									type: 'project',
									key: 'proj1',
								},
							},
						],
					},
				],
				total_count: 1,
				page: 1,
			}),
		});

		const options = {
			apiKey: demoPermitKey,
			page: 1,
			perPage: 10,
			all: false,
			expandKey: false,
			includeResourceInstanceRoles: true,
		};

		const { lastFrame } = render(<List options={options} />);
		expect(lastFrame()?.toString()).toMatch(/Loading Token/);

		await delay(100);
		expect(lastFrame()).toMatch(/Showing 1 items/);

		// Verify the API was called with the correct parameter
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('include_resource_instance_roles=true'),
			expect.any(Object),
		);
	});
});

describe('API Users Commands', () => {
	describe('Assign Role Command', () => {
		it('should assign role successfully', async () => {
			(fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
					data: {
						user: 'user1',
						role: 'admin',
						tenant: 'tenant1',
					},
				}),
			});

			const options = {
				apiKey: demoPermitKey,
				user: 'user1',
				role: 'admin',
				tenant: 'tenant1',
			};

			const { lastFrame } = render(<Assign options={options} />);
			expect(lastFrame()?.toString()).toMatch(/Loading Token/);

			await delay(100);
			expect(lastFrame()).toMatch(/completed successfully/);
		});
	});

	describe('Unassign Role Command', () => {
		it('should unassign role successfully', async () => {
			(fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
				}),
			});

			const options = {
				apiKey: demoPermitKey,
				user: 'user1',
				role: 'admin',
				tenant: 'tenant1',
			};

			const { lastFrame } = render(<Unassign options={options} />);
			expect(lastFrame()?.toString()).toMatch(/Loading Token/);

			await delay(100);
			expect(lastFrame()).toMatch(/completed successfully/);
		});
	});
});

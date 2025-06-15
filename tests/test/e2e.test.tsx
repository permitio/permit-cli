import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRolesApi } from '../../source/hooks/useRolesApi.js';
import { useTenantApi } from '../../source/hooks/useTenantApi.js';
import { useResourcesApi } from '../../source/hooks/useResourcesApi.js';
import { useUserApi } from '../../source/hooks/useUserApi.js';
import { useConditionSetApi } from '../../source/hooks/useConditionSetApi.js';
import { useSetPermissionsApi } from '../../source/hooks/useSetPermissionsApi.js';
import delay from 'delay';
import { GeneratePolicySnapshot } from '../../source/components/test/GeneratePolicySnapshot.js';
import * as keytar from 'keytar';

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

vi.mock('../../source/hooks/useSetPermissionsApi.js', () => ({
	useSetPermissionsApi: vi.fn(),
}));

vi.mock('../../source/hooks/useConditionSetApi.js', () => ({
	useConditionSetApi: vi.fn(),
}));

vi.mock('keytar', () => {
	const demoPermitKey = 'permit_key_'.concat('a'.repeat(97));

	const keytar = {
		setPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		getPassword: vi.fn().mockResolvedValue(() => {
			return demoPermitKey;
		}),
		deletePassword: vi.fn().mockResolvedValue(demoPermitKey),
	};
	return { ...keytar, default: keytar };
});

beforeEach(() => {
	// vi.restoreAllMocks();
	vi.spyOn(process, 'exit').mockImplementation(code => {
		console.warn(`Mocked process.exit(${code}) called`);
	});
});

afterEach(() => {
	// vi.restoreAllMocks();
});

describe('GeneratePolicySnapshot', () => {
	it('should complete dry run flow successfully for RBAC', async () => {
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

		vi.mocked(useConditionSetApi).mockReturnValue({
			getConditionSets: vi.fn((type: string) => {
				if (type === 'userset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'user.department': {
														equals: 'Engineering',
													},
												},
												{
													'user.training_status': {
														equals: 'certified',
													},
												},
												{
													'user.key': {
														'not-equals': 'jay',
													},
												},
											],
										},
										{
											allOf: [
												{
													'user.key': {
														equals: {
															ref: 'user.email',
														},
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
				if (type === 'resourceset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'resource.document_type': {
														equals: 'classified',
													},
												},
												{
													'resource.priority_level': {
														equals: 'high',
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
			}),
		});

		vi.mocked(useSetPermissionsApi).mockReturnValue({
			getSetPermissions: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							id: '899ad6af72b54f6287d7ac41798c4b53',
							key: 'RD_Certified_Employee_on_Document2_query_HIGH_PRIORITY',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:query',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:38:03+00:00',
							updated_at: '2025-04-20T18:38:03+00:00',
						},
						{
							id: '988f997a847c467a8558b8c942aac443',
							key: 'RD_Certified_Employee_on_Document2_create___autogen_Document2',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:create',
							resource_set: '__autogen_Document2',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:03:55+00:00',
							updated_at: '2025-04-20T18:03:55+00:00',
						},
						{
							id: 'caa08402394d4b73bd0819986195abf7',
							key: 'RD_Certified_Employee_on_Document_delete___autogen_Document',
							user_set: 'RD_Certified_Employee',
							permission: 'Document:delete',
							resource_set: '__autogen_Document',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:02:09+00:00',
							updated_at: '2025-04-20T18:02:09+00:00',
						},
						{
							id: 'ea481d9c33494b6eac336092d440f6b7',
							key: '__autogen_admin_on_Document2_delete_HIGH_PRIORITY',
							user_set: '__autogen_admin',
							permission: 'Document2:delete',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T19:11:51+00:00',
							updated_at: '2025-04-20T19:11:51+00:00',
						},
					],
				}),
			),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot dryRun models={['RBAC']} />,
		);

		await delay(1000); // Allow steps to process

		expect(lastFrame()).toMatch(/Building Config/);
		await delay(1000);
		expect(lastFrame()).toMatch(/"config":/);
	}, 3000);

	it('should complete dry run flow successfully for ABAC', async () => {
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

		vi.mocked(useConditionSetApi).mockReturnValue({
			getConditionSets: vi.fn((type: string) => {
				if (type === 'userset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'user.department': {
														equals: 'Engineering',
													},
												},
												{
													'user.training_status': {
														equals: 'certified',
													},
												},
												{
													'user.key': {
														'not-equals': 'jay',
													},
												},
											],
										},
										{
											allOf: [
												{
													'user.key': {
														equals: {
															ref: 'user.email',
														},
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
				if (type === 'resourceset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'resource.document_type': {
														equals: 'classified',
													},
												},
												{
													'resource.priority_level': {
														equals: 'high',
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
			}),
		});

		vi.mocked(useSetPermissionsApi).mockReturnValue({
			getSetPermissions: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							id: '899ad6af72b54f6287d7ac41798c4b53',
							key: 'RD_Certified_Employee_on_Document2_query_HIGH_PRIORITY',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:query',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:38:03+00:00',
							updated_at: '2025-04-20T18:38:03+00:00',
						},
						{
							id: '988f997a847c467a8558b8c942aac443',
							key: 'RD_Certified_Employee_on_Document2_create___autogen_Document2',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:create',
							resource_set: '__autogen_Document2',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:03:55+00:00',
							updated_at: '2025-04-20T18:03:55+00:00',
						},
						{
							id: 'caa08402394d4b73bd0819986195abf7',
							key: 'RD_Certified_Employee_on_Document_delete___autogen_Document',
							user_set: 'RD_Certified_Employee',
							permission: 'Document:delete',
							resource_set: '__autogen_Document',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:02:09+00:00',
							updated_at: '2025-04-20T18:02:09+00:00',
						},
						{
							id: 'ea481d9c33494b6eac336092d440f6b7',
							key: '__autogen_admin_on_Document2_delete_HIGH_PRIORITY',
							user_set: '__autogen_admin',
							permission: 'Document2:delete',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T19:11:51+00:00',
							updated_at: '2025-04-20T19:11:51+00:00',
						},
					],
				}),
			),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot dryRun models={['ABAC']} />,
		);

		await delay(1000); // Allow steps to process

		expect(lastFrame()).toMatch(/Building Config/);
		await delay(2000);
		expect(lastFrame()).toMatch(/"config":/);
	}, 5000);

	it('should complete non-dry run and save to path RBAC', async () => {
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

		vi.mocked(useConditionSetApi).mockReturnValue({
			getConditionSets: vi.fn((type: string) => {
				if (type === 'userset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'user.department': {
														equals: 'Engineering',
													},
												},
												{
													'user.training_status': {
														equals: 'certified',
													},
												},
												{
													'user.key': {
														'not-equals': 'jay',
													},
												},
											],
										},
										{
											allOf: [
												{
													'user.key': {
														equals: {
															ref: 'user.email',
														},
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
				if (type === 'resourceset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'resource.document_type': {
														equals: 'classified',
													},
												},
												{
													'resource.priority_level': {
														equals: 'high',
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
			}),
		});

		vi.mocked(useSetPermissionsApi).mockReturnValue({
			getSetPermissions: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							id: '899ad6af72b54f6287d7ac41798c4b53',
							key: 'RD_Certified_Employee_on_Document2_query_HIGH_PRIORITY',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:query',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:38:03+00:00',
							updated_at: '2025-04-20T18:38:03+00:00',
						},
						{
							id: '988f997a847c467a8558b8c942aac443',
							key: 'RD_Certified_Employee_on_Document2_create___autogen_Document2',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:create',
							resource_set: '__autogen_Document2',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:03:55+00:00',
							updated_at: '2025-04-20T18:03:55+00:00',
						},
						{
							id: 'caa08402394d4b73bd0819986195abf7',
							key: 'RD_Certified_Employee_on_Document_delete___autogen_Document',
							user_set: 'RD_Certified_Employee',
							permission: 'Document:delete',
							resource_set: '__autogen_Document',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:02:09+00:00',
							updated_at: '2025-04-20T18:02:09+00:00',
						},
						{
							id: 'ea481d9c33494b6eac336092d440f6b7',
							key: '__autogen_admin_on_Document2_delete_HIGH_PRIORITY',
							user_set: '__autogen_admin',
							permission: 'Document2:delete',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T19:11:51+00:00',
							updated_at: '2025-04-20T19:11:51+00:00',
						},
					],
				}),
			),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot
				dryRun={false}
				models={['RBAC']}
				path="./test-output/config.json"
			/>,
		);

		await delay(1000); // Wait for config to be written

		expect(lastFrame()).toMatch(/Building Config/);
		await delay(150);
		expect(lastFrame()).toMatch(/Config saved to .*test-output/);
	});
	it('should complete non-dry run and save to path ABAC', async () => {
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

		vi.mocked(useConditionSetApi).mockReturnValue({
			getConditionSets: vi.fn((type: string) => {
				if (type === 'userset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'user.department': {
														equals: 'Engineering',
													},
												},
												{
													'user.training_status': {
														equals: 'certified',
													},
												},
												{
													'user.key': {
														'not-equals': 'jay',
													},
												},
											],
										},
										{
											allOf: [
												{
													'user.key': {
														equals: {
															ref: 'user.email',
														},
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
				if (type === 'resourceset') {
					return Promise.resolve({
						data: [
							{
								conditions: {
									allOf: [
										{
											allOf: [
												{
													'resource.document_type': {
														equals: 'classified',
													},
												},
												{
													'resource.priority_level': {
														equals: 'high',
													},
												},
											],
										},
									],
								},
							},
						],
					});
				}
			}),
		});

		vi.mocked(useSetPermissionsApi).mockReturnValue({
			getSetPermissions: vi.fn(() =>
				Promise.resolve({
					data: [
						{
							id: '899ad6af72b54f6287d7ac41798c4b53',
							key: 'RD_Certified_Employee_on_Document2_query_HIGH_PRIORITY',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:query',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:38:03+00:00',
							updated_at: '2025-04-20T18:38:03+00:00',
						},
						{
							id: '988f997a847c467a8558b8c942aac443',
							key: 'RD_Certified_Employee_on_Document2_create___autogen_Document2',
							user_set: 'RD_Certified_Employee',
							permission: 'Document2:create',
							resource_set: '__autogen_Document2',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:03:55+00:00',
							updated_at: '2025-04-20T18:03:55+00:00',
						},
						{
							id: 'caa08402394d4b73bd0819986195abf7',
							key: 'RD_Certified_Employee_on_Document_delete___autogen_Document',
							user_set: 'RD_Certified_Employee',
							permission: 'Document:delete',
							resource_set: '__autogen_Document',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T18:02:09+00:00',
							updated_at: '2025-04-20T18:02:09+00:00',
						},
						{
							id: 'ea481d9c33494b6eac336092d440f6b7',
							key: '__autogen_admin_on_Document2_delete_HIGH_PRIORITY',
							user_set: '__autogen_admin',
							permission: 'Document2:delete',
							resource_set: 'HIGH_PRIORITY',
							organization_id: 'edb57edcdb3d44ff94186cbb970374cc',
							project_id: '95fa59ff60d54bbfafc14375a614911a',
							environment_id: '3bda38fe46654a83888574eeb0ddd493',
							created_at: '2025-04-20T19:11:51+00:00',
							updated_at: '2025-04-20T19:11:51+00:00',
						},
					],
				}),
			),
		});

		const { lastFrame } = render(
			<GeneratePolicySnapshot
				dryRun={false}
				models={['ABAC']}
				path="./test-output/config.json"
			/>,
		);

		await delay(1000); // Wait for config to be written

		expect(lastFrame()).toMatch(/Building Config/);
		await delay(150);
		expect(lastFrame()).toMatch(/Config saved to .*test-output/);
	});
});

import { vi } from 'vitest';
export const mockResources = [
	{
		key: 'document',
		name: 'Document',
		actions: { read: { name: 'Read' } },
	},
];
export const mockRoles = [
	{
		key: 'admin',
		name: 'Administrator',
		permissions: ['document:read'],
	},
];
export const mockUserAttributes = [
	{
		key: 'department',
		type: 'string',
		description: 'User department',
	},
];
export const getMockPermit = () => ({
	api: {
		resources: {
			list: vi.fn().mockResolvedValue(mockResources),
		},
		roles: {
			list: vi.fn().mockResolvedValue(mockRoles),
		},
		resourceAttributes: {
			list: vi.fn().mockImplementation(({ resourceKey }) => {
				if (resourceKey === '__user') {
					return Promise.resolve(mockUserAttributes);
				}
				return Promise.resolve([]);
			}),
		},

		users: {
			list: vi.fn().mockResolvedValue([]),
		},
		conditionSets: {
			list: vi.fn().mockResolvedValue([]),
		},
		relationshipTuples: {
			list: vi.fn().mockResolvedValue([]),
		},
	},
});

export const mockValidateApiKeyScope = vi.fn().mockResolvedValue({
	valid: true,
	scope: {
		organization_id: 'org-123',
		project_id: 'proj-123',
		environment_id: 'env-123',
	},
});

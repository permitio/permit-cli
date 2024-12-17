import { expect, vi, describe, it, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import Export from '../source/commands/env/export/index.js';
import { Permit } from 'permitio';
import * as fs from 'node:fs/promises';
import type { useApiKeyApi } from '../source/hooks/useApiKeyApi';

// Create mock objects
const mockValidateApiKeyScope = vi.fn();
const mockUseApiKeyApi = vi.fn(() => ({
	validateApiKeyScope: mockValidateApiKeyScope,
}));
const mockUseAuth = vi.fn(() => ({
	authToken: 'mock-auth-token',
}));

// Mock hooks and dependencies
vi.mock('../source/hooks/useApiKeyApi', () => ({
	useApiKeyApi: () => mockUseApiKeyApi(),
}));

vi.mock('../source/components/AuthProvider', () => ({
	AuthProvider: vi.fn(({ children }) => children),
	useAuth: () => mockUseAuth(),
}));

vi.mock('permitio');
vi.mock('node:fs/promises');

// Mock sample data
const mockResources = [
	{
		key: 'document',
		name: 'Document',
		description: 'Document resource',
		actions: {
			read: { name: 'Read', description: 'Read document' },
			write: { name: 'Write' },
		},
		attributes: {
			owner: { type: 'string', description: 'Document owner' },
		},
	},
	{
		key: '__user',
		name: 'User',
		actions: {},
	},
];

const mockRoles = [
	{
		key: 'admin',
		name: 'Administrator',
		description: 'Admin role',
		permissions: ['document:read', 'document:write'],
		extends: ['viewer'],
	},
];

const mockUserAttributes = [
	{
		key: 'department',
		type: 'string',
		description: 'User department',
	},
];

const mockConditionSets = [
	{
		key: 'us_employees',
		name: 'US Employees',
		type: 'userset',
		description: 'Employees in US',
		conditions: { country: 'US' },
	},
	{
		key: 'confidential_docs',
		name: 'Confidential Documents',
		type: 'resourceset',
		description: 'Confidential documents',
		resource_id: 'document',
		conditions: { classification: 'confidential' },
	},
];

const mockConditionSetRules = [
	{
		user_set: 'us_employees',
		permission: 'document:read',
		resource_set: 'confidential_docs',
	},
];

describe('Export Command', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset useAuth mock to default value
		mockUseAuth.mockImplementation(() => ({
			authToken: 'mock-auth-token',
		}));

		// Setup Permit mock
		const mockPermit = {
			api: {
				resources: { list: vi.fn().mockResolvedValue(mockResources) },
				roles: { list: vi.fn().mockResolvedValue(mockRoles) },
				resourceAttributes: {
					list: vi.fn().mockResolvedValue(mockUserAttributes),
				},
				resourceRelations: { list: vi.fn().mockResolvedValue([]) },
				conditionSets: { list: vi.fn().mockResolvedValue(mockConditionSets) },
				conditionSetRules: {
					list: vi.fn().mockResolvedValue(mockConditionSetRules),
				},
			},
		};
		vi.mocked(Permit).mockImplementation(() => mockPermit as any);

		// Setup API key validation mock
		mockValidateApiKeyScope.mockResolvedValue({
			valid: true,
			scope: {
				organization_id: 'org-123',
				project_id: 'proj-123',
				environment_id: 'env-123',
			},
			error: null,
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('exports configuration successfully to console', async () => {
		const { lastFrame, unmount } = render(
			<Export options={{ key: 'test-key' }} />,
		);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Export completed successfully!');
		});

		expect(Permit).toHaveBeenCalledWith({
			token: 'test-key',
			pdp: 'http://localhost:7766',
		});
		expect(mockValidateApiKeyScope).toHaveBeenCalledWith(
			'test-key',
			'environment',
		);

		unmount();
	});

	it('exports configuration successfully to file', async () => {
		const mockWriteFile = vi.mocked(fs.writeFile).mockResolvedValue(undefined);

		const { lastFrame, unmount } = render(
			<Export options={{ key: 'test-key', file: 'output.tf' }} />,
		);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Export completed successfully!');
			expect(lastFrame()).toContain('HCL content has been saved to: output.tf');
		});

		expect(mockWriteFile).toHaveBeenCalled();
		expect(mockWriteFile.mock.calls[0][0]).toBe('output.tf');
		expect(mockWriteFile.mock.calls[0][1]).toContain('terraform {');

		unmount();
	});

	it('handles invalid API key error', async () => {
		mockValidateApiKeyScope.mockResolvedValue({
			valid: false,
			error: 'Invalid API key',
			scope: null,
		});

		const { lastFrame, unmount } = render(
			<Export options={{ key: 'invalid-key' }} />,
		);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Error: Invalid API key');
		});

		unmount();
	});

	it('handles missing API key error', async () => {
		mockUseAuth.mockImplementation(() => ({
			authToken: null,
		}));

		const { lastFrame, unmount } = render(<Export options={{}} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain('No API key provided');
		});

		unmount();
	});

	it('handles resource fetch error with warning', async () => {
    const mockError = new Error('Failed to fetch resources');
    const mockPermit = {
      api: {
        resources: { list: vi.fn().mockRejectedValue(mockError) },
        roles: { list: vi.fn().mockResolvedValue([]) },
        resourceAttributes: { list: vi.fn().mockResolvedValue([]) },
        resourceRelations: { list: vi.fn().mockResolvedValue([]) },
        conditionSets: { list: vi.fn().mockResolvedValue([]) },
        conditionSetRules: { list: vi.fn().mockResolvedValue([]) },
      },
    };
    vi.mocked(Permit).mockImplementation(() => mockPermit as any);
  
    const { lastFrame, unmount } = render(
      <Export options={{ key: 'test-key' }} />,
    );
  
    await vi.waitFor(() => {
      console.log('Last frame content:', lastFrame());
      expect(lastFrame()).toContain('Failed to export configuration');
    });
  
    unmount();
  });

	it('displays spinner and status during export', async () => {
		const { lastFrame, frames, unmount } = render(
			<Export options={{ key: 'test-key' }} />,
		);

		// Check initial loading state
		expect(frames[0]).toContain('Exporting environment configuration');

		// Should show various status messages during export
		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Export completed successfully!');
		});

		unmount();
	});

	it('handles file write errors', async () => {
		const mockError = new Error('Permission denied');
		vi.mocked(fs.writeFile).mockRejectedValue(mockError);

		const { lastFrame, unmount } = render(
			<Export options={{ key: 'test-key', file: 'output.tf' }} />,
		);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain(
				'Failed to export configuration: Permission denied',
			);
		});

		unmount();
	});

	it('uses auth token when no API key is provided', async () => {
		const { lastFrame, unmount } = render(<Export options={{}} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain('Export completed successfully!');
		});

		expect(Permit).toHaveBeenCalledWith({
			token: 'mock-auth-token',
			pdp: 'http://localhost:7766',
		});

		unmount();
	});
});

import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Box, Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleInput } from '../../../source/components/policy/RoleInput.js';

// Create reusable mock functions
const mockGetExistingRoles = vi.fn().mockResolvedValue(new Set());

// Mock the hooks ONCE at the top level
vi.mock('../../../source/hooks/useRolesApi.js', () => ({
	useRolesApi: () => ({
		getExistingRoles: mockGetExistingRoles,
		status: 'idle',
	}),
}));

// Mock Text Input component
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }) => {
		// Store handlers in module scope instead of global
		vi.stubGlobal('textInputHandlers', { onChange, onSubmit });
		return <Text>Input: {value}</Text>;
	},
}));

describe('RoleInput', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();
	const availableResources = ['users', 'posts'];
	const availableActions = ['create', 'read', 'update', 'delete'];

	beforeEach(() => {
		vi.resetAllMocks();
		mockGetExistingRoles.mockResolvedValue(new Set());
	});

	afterEach(() => {
		cleanup();
	});

	it('should render correctly', () => {
		const { lastFrame } = render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Role Configuration');
		expect(lastFrame()).toContain('Available resources');
		expect(lastFrame()).toContain('Available actions');
	});

	it('should handle valid input', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Simulate submitting valid input using global handlers
		global.textInputHandlers.onSubmit('admin:Administrator@*:*');

		// Wait for the async operation to complete - use longer timeout
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnComplete).toHaveBeenCalled();
		expect(mockOnComplete.mock.calls[0][0]).toEqual([
			{
				key: 'admin',
				name: 'admin',
				description: 'Administrator',
				permissions: ['*:*'],
			},
		]);
	});

	it('should handle multiple roles', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnComplete.mockClear();

		// Simulate submitting valid input with multiple roles
		global.textInputHandlers.onSubmit(
			'admin:Administrator@*:*, user:Basic User@users:read|posts:read',
		);

		// Wait for the async operation to complete - use longer timeout
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnComplete).toHaveBeenCalled();
		expect(mockOnComplete.mock.calls[0][0].length).toBe(2);
		expect(mockOnComplete.mock.calls[0][0][1].permissions).toEqual([
			'users:read',
			'posts:read',
		]);
	});

	it('should handle empty input', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnError.mockClear();
		mockOnComplete.mockClear();

		// Simulate submitting empty input
		global.textInputHandlers.onSubmit('   ');

		// Wait for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith('Please enter at least one role');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should validate role keys', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnError.mockClear();
		mockOnComplete.mockClear();

		// Simulate submitting input with invalid role key
		global.textInputHandlers.onSubmit('valid, 123invalid:Description@*:*');

		// Wait for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid role key: 123invalid'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should validate permissions', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnError.mockClear();
		mockOnComplete.mockClear();

		// Simulate submitting input with invalid permission
		global.textInputHandlers.onSubmit('admin:Administrator@invalid:perm');

		// Wait for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid permissions for role admin'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should handle wildcard permissions correctly', async () => {
		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnError.mockClear();
		mockOnComplete.mockClear();

		// Simulate submitting input with wildcard permissions
		global.textInputHandlers.onSubmit('admin:Administrator@*:*|users:*|*:read');

		// Wait for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnComplete).toHaveBeenCalled();
	});

	it('should check for existing roles', async () => {
		// Update mock to return existing roles for this test only
		mockGetExistingRoles.mockResolvedValue(new Set(['admin']));

		render(
			<RoleInput
				projectId="proj123"
				environmentId="env123"
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Clear any leftover handlers state
		mockOnError.mockClear();
		mockOnComplete.mockClear();

		// Simulate submitting input with existing role
		global.textInputHandlers.onSubmit('admin:Administrator@*:*');

		// Wait for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Roles already exist: admin'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});
});

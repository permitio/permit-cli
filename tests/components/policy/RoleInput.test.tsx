import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleInput } from '../../../source/components/policy/RoleInput.js';

// Mock useRolesApi
const mockGetExistingRoles = vi.fn().mockResolvedValue(new Set());
vi.mock('../../../source/hooks/useRolesApi.js', () => ({
	useRolesApi: () => ({
		getExistingRoles: mockGetExistingRoles,
		status: 'idle',
	}),
}));

// Mock ink-text-input
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }) => {
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

	it('renders with dynamic placeholder', () => {
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		expect(lastFrame()).toContain('Role Configuration');
		expect(lastFrame()).toContain('Enter roles in the format');
		expect(lastFrame()).toContain('Example:');
		expect(lastFrame()).toContain('Input:');
	});

	it('accepts a valid role:resource:action', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin:users:create|posts:read');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create', 'posts:read'],
			},
		]);
		expect(mockOnError).not.toHaveBeenCalled();
	});

	it('expands role:resource to all actions', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('editor:posts');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{
				key: 'editor',
				name: 'editor',
				permissions: [
					'posts:create',
					'posts:read',
					'posts:update',
					'posts:delete',
				],
			},
		]);
	});

	it('accepts multiple roles', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin:users:create,editor:posts:read');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create'],
			},
			{
				key: 'editor',
				name: 'editor',
				permissions: ['posts:read'],
			},
		]);
	});

	it('rejects invalid role key', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('123bad:users:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid role key: 123bad'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('rejects invalid resource', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin:invalid:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid resource in permission: invalid:create'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('rejects invalid action', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin:users:fly');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid action in permission: users:fly'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('rejects duplicate role', async () => {
		mockGetExistingRoles.mockResolvedValue(new Set(['admin']));
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin:users:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Role "admin" already exists'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('shows error if no permissions', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('admin');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining(
				'Role must have at least one resource or resource:action',
			),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('uses placeholder if input is empty', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		global.textInputHandlers.onSubmit('');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalled();
	});
});

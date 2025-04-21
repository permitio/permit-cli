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
			/>,
		);
		expect(lastFrame()).toContain('Configure Roles and Permissions');
		expect(lastFrame()).toContain('Roles/Permissions Convention');
		expect(lastFrame()).toContain('Example:');
		expect(lastFrame()).toContain('Input:');
	});

	it('accepts a valid role|resource:action|resource:action', async () => {
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('admin|users:create|posts:read');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create', 'posts:read'],
			},
		]);
		expect(lastFrame()).not.toContain('red');
	});

	it('expands role|resource to all actions', async () => {
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('editor|posts');
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
			/>,
		);
		global.textInputHandlers.onSubmit('admin|users:create,editor|posts:read');
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
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('123bad|users:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).not.toHaveBeenCalled();
		expect(lastFrame()).toContain('Invalid role key: 123bad');
	});

	it('rejects invalid resource', async () => {
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('admin|invalid:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).not.toHaveBeenCalled();
		expect(lastFrame()).toContain(
			'Invalid resource in permission: invalid:create',
		);
	});

	it('rejects invalid action', async () => {
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('admin|users:fly');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).not.toHaveBeenCalled();
		expect(lastFrame()).toContain('Invalid action in permission: users:fly');
	});

	it('accepts existing roles', async () => {
		mockGetExistingRoles.mockResolvedValue(new Set(['admin']));
		render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('admin|users:create');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{
				key: 'admin',
				name: 'admin',
				permissions: ['users:create'],
			},
		]);
	});

	it('shows error if no permissions', async () => {
		const { lastFrame } = render(
			<RoleInput
				availableActions={availableActions}
				availableResources={availableResources}
				onComplete={mockOnComplete}
			/>,
		);
		global.textInputHandlers.onSubmit('admin');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).not.toHaveBeenCalled();
		expect(lastFrame()).toContain(
			'Role must have at least one resource or resource:action',
		);
	});
});

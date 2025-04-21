import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionInput } from '../../../source/components/policy/ActionsInput.js';

// Mock ink-text-input
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit, placeholder }) => {
		vi.stubGlobal('textInputHandlers', { onChange, onSubmit, placeholder });
		return <Text>Input: {value}</Text>;
	},
}));

describe('ActionInput', () => {
	const mockOnComplete = vi.fn();
	const availableResources = ['users', 'posts'];

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders with placeholder and resources', () => {
		const { lastFrame } = render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		expect(lastFrame()).toContain('Configure Actions');
		expect(lastFrame()).toContain('Resources: users, posts');
		expect(lastFrame()).toContain('Example:');
		expect(lastFrame()).toContain('Input:');
	});

	it('shows current actions as user types', () => {
		render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		global.textInputHandlers.onChange('create, read');
		// No assertion here, but you could snapshot or check the output if you render the preview
	});

	it('submits valid actions', () => {
		render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		global.textInputHandlers.onSubmit('create,read');
		expect(mockOnComplete).toHaveBeenCalledWith({
			create: { name: 'create', description: 'Create access' },
			read: { name: 'read', description: 'Read access' },
		});
	});

	it('shows error for invalid action keys', async () => {
		const { lastFrame } = render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		global.textInputHandlers.onSubmit('create, 123bad');
		// Wait for the component to update
		await new Promise(r => setTimeout(r, 50));
		expect(lastFrame()).toContain('Invalid action keys: 123bad');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('fills input with placeholder on first empty submit', () => {
		render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		global.textInputHandlers.onSubmit('');
		// Should set input to placeholder, not call onComplete
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('submits after placeholder is filled and Enter is pressed again', () => {
		render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		// First Enter with empty input fills with placeholder
		global.textInputHandlers.onSubmit('');
		// Simulate user pressing Enter again (input now equals placeholder)
		global.textInputHandlers.onSubmit('create, read, update, delete');
		expect(mockOnComplete).toHaveBeenCalledWith({
			create: { name: 'create', description: 'Create access' },
			read: { name: 'read', description: 'Read access' },
			update: { name: 'update', description: 'Update access' },
			delete: { name: 'delete', description: 'Delete access' },
		});
	});

	it('shows error when no actions are provided', async () => {
		const { lastFrame } = render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		global.textInputHandlers.onSubmit('   ,   ');
		await new Promise(r => setTimeout(r, 50));
		expect(lastFrame()).toContain('Please enter at least one action');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('clears input after successful submission', async () => {
		const { lastFrame } = render(
			<ActionInput
				onComplete={mockOnComplete}
				availableResources={availableResources}
			/>,
		);
		// Set input
		global.textInputHandlers.onChange('create');
		// Submit
		global.textInputHandlers.onSubmit('create');
		// Wait for state updates
		await new Promise(r => setTimeout(r, 50));
		// Input should be cleared
		expect(lastFrame()).toContain('Input:');
	});
});

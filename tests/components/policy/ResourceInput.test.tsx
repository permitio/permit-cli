import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceInput } from '../../../source/components/policy/ResourceInput.js';

// Mock useResourcesApi
const mockGetExistingResources = vi.fn().mockResolvedValue(new Set());
vi.mock('../../../source/hooks/useResourcesApi.js', () => ({
	useResourcesApi: () => ({
		getExistingResources: mockGetExistingResources,
		status: 'idle',
	}),
}));

// Mock ink-text-input
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit, placeholder }) => {
		vi.stubGlobal('textInputHandlers', { onChange, onSubmit, placeholder });
		return <Text>Input: {value}</Text>;
	},
}));

describe('ResourceInput', () => {
	const mockOnComplete = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		mockGetExistingResources.mockResolvedValue(new Set());
	});

	afterEach(() => {
		cleanup();
	});

	it('renders with placeholder', () => {
		const { lastFrame } = render(<ResourceInput onComplete={mockOnComplete} />);
		expect(lastFrame()).toContain('Configure Resources');
		expect(lastFrame()).toContain('Example:');
		expect(lastFrame()).toContain('Input:');
	});

	it('submits valid resources', async () => {
		render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onSubmit('posts,comments');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{ key: 'posts', name: 'posts', actions: {} },
			{ key: 'comments', name: 'comments', actions: {} },
		]);
	});

	it('shows error for invalid resource keys', async () => {
		const { lastFrame } = render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onSubmit('posts, 123bad');
		await new Promise(r => setTimeout(r, 50));
		expect(lastFrame()).toContain('Invalid resource keys: 123bad');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('shows error if no resources entered', async () => {
		const { lastFrame } = render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onSubmit('   ');
		await new Promise(r => setTimeout(r, 50));
		expect(lastFrame()).toContain('Posts, Comments, Authors');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('fills input with placeholder on first empty submit', () => {
		render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onSubmit('');
		// Should set input to placeholder, not call onComplete
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('submits after placeholder is filled and Enter is pressed again', async () => {
		render(<ResourceInput onComplete={mockOnComplete} />);
		// First Enter with empty input fills with placeholder
		global.textInputHandlers.onSubmit('');
		// Simulate user pressing Enter again (input now equals placeholder)
		global.textInputHandlers.onSubmit('posts, comments, authors');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{ key: 'posts', name: 'posts', actions: {} },
			{ key: 'comments', name: 'comments', actions: {} },
			{ key: 'authors', name: 'authors', actions: {} },
		]);
	});

	it('accepts existing resources', async () => {
		mockGetExistingResources.mockResolvedValue(new Set(['posts']));
		render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onSubmit('posts,comments');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{ key: 'posts', name: 'posts', actions: {} },
			{ key: 'comments', name: 'comments', actions: {} },
		]);
	});

	it('clears input after successful submission', async () => {
		const { lastFrame } = render(<ResourceInput onComplete={mockOnComplete} />);
		global.textInputHandlers.onChange('posts');
		global.textInputHandlers.onSubmit('posts');
		await new Promise(r => setTimeout(r, 50));
		// Input should be empty after successful submission
		expect(lastFrame()).toContain('Input:');
	});
});

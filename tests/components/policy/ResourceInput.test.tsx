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
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		mockGetExistingResources.mockResolvedValue(new Set());
	});

	afterEach(() => {
		cleanup();
	});

	it('renders with placeholder', () => {
		const { lastFrame } = render(
			<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />,
		);
		expect(lastFrame()).toContain('Configure Resources');
		expect(lastFrame()).toContain('Example:');
		expect(lastFrame()).toContain('Input:');
	});

	it('submits valid resources', async () => {
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
		global.textInputHandlers.onSubmit('posts,comments');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnComplete).toHaveBeenCalledWith([
			{ key: 'posts', name: 'posts', actions: {} },
			{ key: 'comments', name: 'comments', actions: {} },
		]);
		expect(mockOnError).not.toHaveBeenCalled();
	});

	it('shows error for invalid resource keys', async () => {
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
		global.textInputHandlers.onSubmit('posts, 123bad');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Invalid resource keys: 123bad'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('shows error if no resources entered', async () => {
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
		global.textInputHandlers.onSubmit('   ');
		await new Promise(r => setTimeout(r, 50));
		// Should fill with placeholder, not call onComplete or onError
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('fills input with placeholder on first empty submit', () => {
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
		global.textInputHandlers.onSubmit('');
		// Should set input to placeholder, not call onComplete
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('submits after placeholder is filled and Enter is pressed again', async () => {
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
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

	it('shows error for duplicate resources', async () => {
		mockGetExistingResources.mockResolvedValue(new Set(['posts']));
		render(<ResourceInput onComplete={mockOnComplete} onError={mockOnError} />);
		global.textInputHandlers.onSubmit('posts,comments');
		await new Promise(r => setTimeout(r, 50));
		expect(mockOnError).toHaveBeenCalledWith(
			expect.stringContaining('Resources already exist: posts'),
		);
		expect(mockOnComplete).not.toHaveBeenCalled();
	});
});

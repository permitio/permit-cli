import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionInput } from '../../../source/components/policy/ActionsInput.js';

// Mock Text Input component
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }) => {
		// Store handlers in module scope
		vi.stubGlobal('textInputHandlers', { onChange, onSubmit });
		return <Text>Input: {value}</Text>;
	},
}));

describe('ActionInput', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		vi.stubGlobal('textInputHandlers', null);
	});

	afterEach(() => {
		cleanup();
	});

	it('should render initial state correctly', () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		expect(lastFrame()).toContain('Action Configuration');
		expect(lastFrame()).toContain('Enter action keys');
		expect(lastFrame()).toContain('Input:'); // Empty input initially
	});

	it('should handle valid action keys input', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		global.textInputHandlers.onSubmit('create, read');

		expect(mockOnComplete).toHaveBeenCalledWith({
			create: {
				name: 'create',
				description: 'Create access',
			},
			read: {
				name: 'read',
				description: 'Read access',
			},
		});
		expect(mockOnError).not.toHaveBeenCalled();
	});

	it('should use placeholder values when input is empty', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		global.textInputHandlers.onSubmit('');

		expect(mockOnComplete).toHaveBeenCalledWith({
			create: {
				name: 'create',
				description: 'Create access',
			},
			read: {
				name: 'read',
				description: 'Read access',
			},
			update: {
				name: 'update',
				description: 'Update access',
			},
			delete: {
				name: 'delete',
				description: 'Delete access',
			},
		});
		expect(mockOnError).not.toHaveBeenCalled();
	});

	it('should handle invalid action keys', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		global.textInputHandlers.onSubmit('create, 123invalid');

		expect(mockOnError).toHaveBeenCalledWith('Invalid action keys: 123invalid');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('should handle whitespace and empty entries', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		global.textInputHandlers.onSubmit('  create  ,  read  ,  , ');

		expect(mockOnComplete).toHaveBeenCalledWith({
			create: {
				name: 'create',
				description: 'Create access',
			},
			read: {
				name: 'read',
				description: 'Read access',
			},
		});
		expect(mockOnError).not.toHaveBeenCalled();
	});

	it('should update input value when onChange is called', async () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		global.textInputHandlers.onChange('test');

		expect(lastFrame()).toContain('Input: test');
	});

	it('should clear input after successful submission', async () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		global.textInputHandlers.onChange('create');
		global.textInputHandlers.onSubmit('create');

		expect(lastFrame()).toContain('Action Configuration');
	});
});

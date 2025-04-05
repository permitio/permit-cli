import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionInput } from '../../../source/components/policy/ActionsInput.js';

// Mock Text Input component for all tests
vi.mock('ink-text-input', () => ({
	default: ({ value, onChange, onSubmit }) => {
		// Store handlers in module scope via global
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

	it('should render keys input initially', () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		expect(lastFrame()).toContain('Action Configuration');
		expect(lastFrame()).toContain('Enter action keys');
	});

	it('should handle valid action keys input', async () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		// Manually trigger onSubmit with keys
		global.textInputHandlers.onSubmit('create, read');

		// Wait for state update - use longer timeout
		await new Promise(resolve => setTimeout(resolve, 100));

		// Now the component should be showing the action details screen
		expect(lastFrame()).toContain('Configure action');
	});

	it('should handle empty action keys input', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		// Clear any previous calls
		mockOnError.mockClear();

		// Manually trigger onSubmit with empty input
		global.textInputHandlers.onSubmit('   ');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith(
			'Please enter at least one action',
		);
	});

	it('should validate action key format', async () => {
		render(<ActionInput onComplete={mockOnComplete} onError={mockOnError} />);

		// Clear any previous calls
		mockOnError.mockClear();

		// Manually trigger onSubmit with invalid key
		global.textInputHandlers.onSubmit('valid, 123invalid');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith('Invalid action keys: 123invalid');
	});

	it('should handle action details input', async () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		// First submit valid action keys
		global.textInputHandlers.onSubmit('create');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		// Make sure we're now on the details screen (test might be flaky)
		// If this assertion fails, the state transition didn't happen
		try {
			expect(lastFrame()).toContain('Configure action');
		} catch (e) {
			console.log("State transition didn't occur:", lastFrame());
			throw e;
		}

		// Now submit action details
		global.textInputHandlers.onSubmit('Create Resource@owner,department');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnComplete).toHaveBeenCalledWith({
			create: {
				name: 'create',
				description: 'Create Resource',
				attributes: {
					owner: {},
					department: {},
				},
			},
		});
	});

	it('should validate attribute keys', async () => {
		const { lastFrame } = render(
			<ActionInput onComplete={mockOnComplete} onError={mockOnError} />,
		);

		// First submit valid action keys
		global.textInputHandlers.onSubmit('create');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		// Reset mocks before next step
		mockOnError.mockClear();

		// Submit invalid attribute keys
		global.textInputHandlers.onSubmit('Create@valid,123invalid');

		// Wait for state update
		await new Promise(resolve => setTimeout(resolve, 100));

		expect(mockOnError).toHaveBeenCalledWith(
			'Invalid attribute keys: 123invalid',
		);
	});
});

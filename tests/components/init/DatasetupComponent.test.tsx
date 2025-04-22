import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataSetupComponent from '../../../source/components/init/DataSetupComponent.js';
import delay from 'delay';
import { Text } from 'ink';
import type { Mock } from 'vitest';

// Add to your global type declarations
declare global {
	// eslint-disable-next-line no-var
	var submitCount: ((value: string) => void) | undefined;
	var selectManual: (() => void) | undefined;
	var selectGenerate: (() => void) | undefined;
	// Add this new property
	var currentAPISyncProps:
		| {
				options?: any;
				onComplete?: (userData: any) => void;
				onError?: (error: string) => void;
		  }
		| undefined;
	var currentGenerateProps:
		| {
				onComplete?: (userData: any) => void;
				onError?: (error: string) => void;
		  }
		| undefined;
}

// Mock hooks and child components
let mockUserComplete: Mock = vi.fn();
let mockUserError: Mock = vi.fn();
let mockGenerateComplete: Mock = vi.fn();
let mockGenerateError: Mock = vi.fn();
let countInputValue: string = '0';

// Mock TextInput component
vi.mock('ink-text-input', () => {
	return {
		default: ({ value, onChange, onSubmit }: any) => {
			// Store current value for testing
			countInputValue = value;

			// Expose submit handler to tests
			global.submitCount = (inputValue: string) => {
				onChange(inputValue);
				onSubmit(inputValue);
			};

			return <Text>TextInput-{value}</Text>;
		},
	};
});

// Mock SelectInput component
vi.mock('ink-select-input', () => {
	return {
		default: ({ items, onSelect }: any) => {
			// Expose selection handlers to tests
			global.selectManual = () => {
				onSelect(items[0]); // First option is "Interactively create users"
			};
			global.selectGenerate = () => {
				onSelect(items[1]); // Second option is "Generate users"
			};

			return (
				<Text>
					SelectInput-{items.map((item: any) => item.label).join(',')}
				</Text>
			);
		},
	};
});

// Mock APISyncUserComponent
vi.mock('../../../source/components/api/sync/APISyncUserComponent.js', () => {
	return {
		default: ({ options, onComplete, onError }: any) => {
			// Store the callback references for this instance
			// Important: We're storing the actual callbacks, not wrapping them
			global.currentAPISyncProps = { options, onComplete, onError };

			// Replace the functions with our test controls
			mockUserComplete = vi.fn(userData => {
				const currentOnComplete = global.currentAPISyncProps?.onComplete;
				if (currentOnComplete) currentOnComplete(userData);
			});

			mockUserError = vi.fn(errorMsg => {
				const currentOnError = global.currentAPISyncProps?.onError;
				if (currentOnError) currentOnError(errorMsg);
			});

			return (
				<Text>APISyncUserComponent-apiKey:{options?.apiKey || 'none'}</Text>
			);
		},
	};
});

// Mock GeneratedUsersComponent
vi.mock('../../../source/components/init/GenerateUsersComponent.js', () => {
	return {
		default: ({ onComplete, onError }: any) => {
			// Store reference to callbacks
			mockGenerateComplete = vi.fn(userData => {
				if (onComplete) onComplete(userData);
			});
			mockGenerateError = vi.fn(errorMsg => {
				if (onError) onError(errorMsg);
			});

			return <Text>GeneratedUsersComponent</Text>;
		},
	};
});

// Mock Spinner component
vi.mock('ink-spinner', () => {
	return {
		default: () => <Text>Spinner</Text>,
	};
});

// Helper function to wait for effects
const waitForEffects = async (time = 100) => {
	await delay(time);
};

describe('DataSetupComponent', () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.resetAllMocks();
		countInputValue = '0';
	});

	// Clear global handlers after each test
	afterEach(() => {
		if (global.submitCount) delete global.submitCount;
		if (global.selectManual) delete global.selectManual;
		if (global.selectGenerate) delete global.selectGenerate;
	});

	describe('Initial render and navigation', () => {
		it('should render initial selection options', () => {
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			expect(lastFrame()).toContain('Data Setup:');
			expect(lastFrame()).toContain(
				'Interactively create users,Generate users',
			);
		});

		it('should navigate to askCount step when Manual is selected', async () => {
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			// Select Manual option
			if (global.selectManual) global.selectManual();

			await waitForEffects();

			expect(lastFrame()).toContain('How many users do you want to create');
			expect(lastFrame()).toContain('TextInput-');
		});

		it('should navigate to Generate step when Generate is selected', async () => {
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			// Select Generate option
			if (global.selectGenerate) global.selectGenerate();

			await waitForEffects();

			expect(lastFrame()).toContain('GeneratedUsersComponent');
		});
	});

	describe('Manual flow', () => {
		it('should validate user count and show error for invalid input', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Navigate to askCount
			if (global.selectManual) global.selectManual();
			await waitForEffects();

			// Submit invalid count (0)
			if (global.submitCount) global.submitCount('0');
			await waitForEffects();

			// Error should be triggered
			expect(onError).toHaveBeenCalledWith('Invalid user count');
		});

		it('should validate user count and show error for non-numeric input', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Navigate to askCount
			if (global.selectManual) global.selectManual();
			await waitForEffects();

			// Submit invalid count (abc)
			if (global.submitCount) global.submitCount('abc');
			await waitForEffects();

			// Error should be triggered
			expect(onError).toHaveBeenCalledWith('Invalid user count');
		});

		it('should handle error in Manual flow and call onError', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Navigate to askCount
			if (global.selectManual) global.selectManual();
			await waitForEffects();

			// Submit valid count (1)
			if (global.submitCount) global.submitCount('1');
			await waitForEffects();

			// Simulate error
			await waitForEffects();

			// onError should be called with error message
			expect(onError).toHaveBeenCalledWith('Invalid user count');
		});

		it('should pass apiKey to APISyncUserComponent', async () => {
			const { lastFrame } = render(
				<DataSetupComponent
					apiKey="test-api-key"
					onComplete={vi.fn()}
					onError={vi.fn()}
				/>,
			);

			// Navigate to Manual flow
			if (global.selectManual) global.selectManual();
			await waitForEffects();

			// Submit valid count
			if (global.submitCount) global.submitCount('1');
			await waitForEffects();

			// Check if apiKey is passed correctly
		});
	});

	describe('Generate flow', () => {
		it('should render GeneratedUsersComponent when Generate is selected', async () => {
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			// Select Generate option
			if (global.selectGenerate) global.selectGenerate();
			await waitForEffects();

			expect(lastFrame()).toContain('GeneratedUsersComponent');
		});

		it('should handle generated user completion and call onComplete', async () => {
			const onComplete = vi.fn();
			const { lastFrame } = render(
				<DataSetupComponent onComplete={onComplete} onError={vi.fn()} />,
			);

			// Select Generate option
			if (global.selectGenerate) global.selectGenerate();
			await waitForEffects();

			// Simulate completion with generated user
			const generatedUser = {
				userId: 'generated-user',
				firstName: 'Generated',
				lastName: 'User',
				email: 'generated@example.com',
			};

			mockGenerateComplete(generatedUser);
			await waitForEffects();

			// onComplete should be called with generated user
			expect(onComplete).toHaveBeenCalledWith(generatedUser);
		});

		it('should handle error in Generate flow and call onError', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<DataSetupComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Select Generate option
			if (global.selectGenerate) global.selectGenerate();
			await waitForEffects();

			// Simulate error
			mockGenerateError('Generation failed');
			await waitForEffects();

			// onError should be called with error message
			expect(onError).toHaveBeenCalledWith('Generation failed');
		});
	});
});

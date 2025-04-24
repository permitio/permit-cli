import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EnforceComponent from '../../../source/components/init/EnforceComponent.js';
import delay from 'delay';
import { Text } from 'ink';
import type { Mock } from 'vitest';

// Extend globalThis for TypeScript
declare global {
	// eslint-disable-next-line no-var
	var selectRun: (() => void) | undefined;
	var selectShow: (() => void) | undefined;
	var pdpRunComplete: (() => void) | undefined;
	var pdpRunError: ((error: string) => void) | undefined;
}

// Mock SelectInput component
vi.mock('ink-select-input', () => {
	return {
		default: ({ items, onSelect }: any) => {
			// Expose selection handlers to tests
			global.selectRun = () => {
				onSelect(items[0]); // First option is "Run PDP"
			};
			global.selectShow = () => {
				onSelect(items[1]); // Second option is "Show PDP command"
			};

			return (
				<Text>
					SelectInput-{items.map((item: any) => item.label).join(',')}
				</Text>
			);
		},
	};
});

// Mock PDPRunComponent
let mockPDPComplete: Mock = vi.fn();
let mockPDPError: Mock = vi.fn();

vi.mock('../../../source/components/pdp/PDPRunComponent.js', () => {
	return {
		default: ({ dryRun, onComplete, onError }: any) => {
			// Store references to callbacks for testing
			global.pdpRunComplete = () => {
				mockPDPComplete();
				if (onComplete) onComplete();
			};

			global.pdpRunError = (error: string) => {
				mockPDPError(error);
				if (onError) onError(error);
			};

			return <Text>PDPRunComponent-{dryRun ? 'dryRun' : 'actual'}</Text>;
		},
	};
});

// Mock Spinner component
vi.mock('ink-spinner', () => {
	return {
		default: ({ type }: any) => <Text>Spinner-{type}</Text>,
	};
});

// Helper function to wait for effects
const waitForEffects = async (time = 50) => {
	await delay(time);
};

describe('EnforceComponent', () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// Clear global handlers after each test
	afterEach(() => {
		if (global.selectRun) delete global.selectRun;
		if (global.selectShow) delete global.selectShow;
		if (global.pdpRunComplete) delete global.pdpRunComplete;
		if (global.pdpRunError) delete global.pdpRunError;
	});

	describe('Initial render', () => {
		it('should render initial selection options', () => {
			const { lastFrame } = render(
				<EnforceComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			expect(lastFrame()).toContain('Enforce:');
			expect(lastFrame()).toContain('Run PDP ,Show PDP command');
		});
	});

	describe('Run PDP flow', () => {
		it('should navigate to run step when Run PDP is selected', async () => {
			const { lastFrame } = render(
				<EnforceComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			// Select Run PDP option
			if (global.selectRun) global.selectRun();

			await waitForEffects();

			expect(lastFrame()).toContain('Running PDP...');
			expect(lastFrame()).toContain('PDPRunComponent-actual');
		});

		it('should call onComplete when PDPRunComponent completes', async () => {
			const onComplete = vi.fn();
			const { lastFrame } = render(
				<EnforceComponent onComplete={onComplete} onError={vi.fn()} />,
			);

			// Navigate to run step
			if (global.selectRun) global.selectRun();
			await waitForEffects();

			// Simulate PDPRunComponent completion
			if (global.pdpRunComplete) global.pdpRunComplete();
			await waitForEffects();

			// onComplete should be called
			expect(onComplete).toHaveBeenCalled();
		});

		it('should call onError when PDPRunComponent fails', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<EnforceComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Navigate to run step
			if (global.selectRun) global.selectRun();
			await waitForEffects();

			// Simulate PDPRunComponent error
			if (global.pdpRunError) global.pdpRunError('PDP run failed');
			await waitForEffects();

			// onError should be called with error message
			expect(onError).toHaveBeenCalledWith('PDP run failed');
		});
	});

	describe('Show PDP command flow', () => {
		it('should navigate to show step when Show PDP command is selected', async () => {
			const { lastFrame } = render(
				<EnforceComponent onComplete={vi.fn()} onError={vi.fn()} />,
			);

			// Select Show PDP command option
			if (global.selectShow) global.selectShow();

			await waitForEffects();

			expect(lastFrame()).toContain('PDPRunComponent-dryRun');
		});

		it('should call onComplete when showing command completes', async () => {
			const onComplete = vi.fn();
			const { lastFrame } = render(
				<EnforceComponent onComplete={onComplete} onError={vi.fn()} />,
			);

			// Navigate to show step
			if (global.selectShow) global.selectShow();
			await waitForEffects();

			// Simulate PDPRunComponent completion
			if (global.pdpRunComplete) global.pdpRunComplete();
			await waitForEffects();

			// onComplete should be called
			expect(onComplete).toHaveBeenCalled();
		});

		it('should call onError when showing command fails', async () => {
			const onError = vi.fn();
			const { lastFrame } = render(
				<EnforceComponent onComplete={vi.fn()} onError={onError} />,
			);

			// Navigate to show step
			if (global.selectShow) global.selectShow();
			await waitForEffects();

			// Simulate PDPRunComponent error
			if (global.pdpRunError) global.pdpRunError('Command generation failed');
			await waitForEffects();

			// onError should be called with error message
			expect(onError).toHaveBeenCalledWith('Command generation failed');
		});
	});

	describe('Error handling', () => {
		it('should set error state and call onError', async () => {
			const onError = vi.fn();
			render(<EnforceComponent onComplete={vi.fn()} onError={onError} />);

			// Navigate to run step
			if (global.selectRun) global.selectRun();
			await waitForEffects();

			// Simulate error
			if (global.pdpRunError) global.pdpRunError('Test error');
			await waitForEffects();

			expect(onError).toHaveBeenCalledWith('Test error');
		});
	});
});

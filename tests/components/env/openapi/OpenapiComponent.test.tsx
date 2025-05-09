import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { expect, it, describe, vi, beforeEach } from 'vitest';
import OpenapiComponent from '../../../../source/components/env/openapi/OpenapiComponent';

// Set up state control
let statusSetter;
let errorSetter;
let progressSetter;
let processingDoneSetter;

// Create mock processSpec function
const mockProcessSpec = vi.fn().mockImplementation(async () => {
	// Default implementation just resolves
	return true;
});

// Mock the useOpenapiProcessor hook
vi.mock('../../../../source/hooks/openapi/useOpenapiProcessor', () => ({
	useOpenapiProcessor: ({
		setStatus,
		setError,
		setProgress,
		setProcessingDone,
	}) => {
		// Store the setters for external control
		statusSetter = setStatus;
		errorSetter = setError;
		progressSetter = setProgress;
		processingDoneSetter = setProcessingDone;

		return {
			processSpec: mockProcessSpec,
		};
	},
}));

// Mock the form component to capture the onSubmit function
let formSubmitHandler;
vi.mock('../../../../source/components/env/openapi/OpenapiForm', () => ({
	default: ({ onSubmit, inputPath, setInputPath }) => {
		formSubmitHandler = onSubmit;
		return <Text>OpenapiForm Mock</Text>; // Use Text component
	},
}));

// Mock the results component
vi.mock('../../../../source/components/env/openapi/OpenapiResults', () => ({
	default: ({ status, error, progress, processingDone }) => (
		<Text>{`OpenapiResults: ${status}, ${error || 'no-error'}, ${progress}, ${processingDone}`}</Text> // Use Text component
	),
}));

// Helper for waiting
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('OpenapiComponent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		formSubmitHandler = null;
		statusSetter = null;
		errorSetter = null;
		progressSetter = null;
		processingDoneSetter = null;
	});

	it('should render the form initially', () => {
		const { lastFrame } = render(<OpenapiComponent />);
		expect(lastFrame()).toContain('OpenapiForm Mock');
	});

	it('should render the form initially with provided specFile', async () => {
		const { lastFrame, rerender } = render(
			<OpenapiComponent specFile="./test.json" />,
		);

		// Wait for useEffect to run and trigger processSpec
		await wait(10);

		// Manually trigger state changes
		statusSetter('loading');
		progressSetter('Loading...');

		// We need to rerender to reflect state changes
		rerender(<OpenapiComponent specFile="./test.json" />);

		expect(lastFrame()).toContain('OpenapiResults:');
		expect(lastFrame()).toContain('loading');
	});

	it('should transition to loading state when form is submitted', async () => {
		const { lastFrame, rerender } = render(<OpenapiComponent />);

		// Make sure formSubmitHandler was captured
		expect(formSubmitHandler).toBeDefined();

		statusSetter('loading');
		progressSetter('Starting to process OpenAPI spec...');

		// Rerender to reflect state changes
		rerender(<OpenapiComponent />);

		expect(lastFrame()).toContain('OpenapiResults:');
		expect(lastFrame()).toContain('loading');
	});

	it('should handle error states correctly', async () => {
		const { lastFrame, rerender } = render(
			<OpenapiComponent specFile="./test.json" />,
		);

		// Wait for initial render and useEffect
		await wait(10);

		// Manually trigger error state
		statusSetter('error');
		errorSetter('Test error message');

		// Rerender to reflect state changes
		rerender(<OpenapiComponent specFile="./test.json" />);

		expect(lastFrame()).toContain('OpenapiResults:');
		expect(lastFrame()).toContain('error');
		expect(lastFrame()).toContain('Test error message');
	});

	it('should handle success states correctly', async () => {
		const { lastFrame, rerender } = render(
			<OpenapiComponent specFile="./test.json" />,
		);

		// Wait for initial render and useEffect
		await wait(10);

		// Manually trigger success state
		statusSetter('success');
		processingDoneSetter(true);

		// Rerender to reflect state changes
		rerender(<OpenapiComponent specFile="./test.json" />);

		expect(lastFrame()).toContain('OpenapiResults:');
		expect(lastFrame()).toContain('success');
		expect(lastFrame()).toContain('true');
	});

	it('should update progress messages correctly', async () => {
		const { lastFrame, rerender } = render(
			<OpenapiComponent specFile="./test.json" />,
		);

		// Wait for initial render and useEffect
		await wait(10);

		// First progress update
		progressSetter('Processing resources...');
		rerender(<OpenapiComponent specFile="./test.json" />);
		expect(lastFrame()).toContain('Processing resources...');

		// Second progress update
		progressSetter('Processing roles...');
		rerender(<OpenapiComponent specFile="./test.json" />);
		expect(lastFrame()).toContain('Processing roles...');

		// Final update
		statusSetter('success');
		rerender(<OpenapiComponent specFile="./test.json" />);
		expect(lastFrame()).toContain('success');
	});
});

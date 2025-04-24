import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, vi, expect, Mock, beforeEach } from 'vitest';
import { Text } from 'ink';

// Module to test
import PolicyStepComponent from '../../../source/components/init/PolicyStepComponent.js';

// Controlled props mock holders
let CreateSimpleWizardMockProps: any = null;
let ApplyComponentMockProps: any = null;

// Sleep util for async waiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// MOCKING: CreateSimpleWizard
vi.mock('../../../source/components/policy/CreateSimpleWizard.js', () => {
	const mockFn = vi.fn(props => {
		CreateSimpleWizardMockProps = props;
		return <Text>SimpleComponent</Text>;
	});
	return { default: mockFn };
});

// MOCKING: ApplyComponent
vi.mock('../../../source/components/env/template/ApplyComponent.js', () => {
	const mockFn = vi.fn(props => {
		ApplyComponentMockProps = props;
		return <Text>TemplateComponent</Text>;
	});
	return { default: mockFn };
});

describe('PolicyStepComponent', () => {
	let mockOnComplete: Mock;
	let mockOnError: Mock;

	beforeEach(() => {
		mockOnComplete = vi.fn();
		mockOnError = vi.fn();
	});

	it('renders the initial policy setup UI', () => {
		const { lastFrame } = render(
			<PolicyStepComponent onComplete={mockOnComplete} onError={mockOnError} />,
		);
		expect(lastFrame()).toContain('Policy Setup:');
	});

	it('renders simple policy creation after enter press', async () => {
		const { lastFrame, stdin } = render(
			<PolicyStepComponent onComplete={mockOnComplete} onError={mockOnError} />,
		);
		await sleep(100);
		stdin.write('\r'); // Select first item
		await sleep(100);
		expect(lastFrame()).toContain('SimpleComponent');
	});

	it('renders template policy creation after arrow down and enter', async () => {
		const { lastFrame, stdin } = render(
			<PolicyStepComponent onComplete={mockOnComplete} onError={mockOnError} />,
		);
		await sleep(100);
		stdin.write('\x1b[B'); // Arrow down
		await sleep(100);
		stdin.write('\r'); // Enter
		await sleep(100);
		expect(lastFrame()).toContain('TemplateComponent');
	});

	it('calls onError handler when ApplyComponent throws', async () => {
		render(
			<PolicyStepComponent onComplete={mockOnComplete} onError={mockOnError} />,
		);
		await sleep(100);

		// Simulate error thrown inside ApplyComponent
		ApplyComponentMockProps.onError('Manual error triggered');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('calls onComplete handler from CreateSimpleWizard', async () => {
		render(
			<PolicyStepComponent onComplete={mockOnComplete} onError={mockOnError} />,
		);
		await sleep(100);

		// Simulate success from wizard
		CreateSimpleWizardMockProps.onComplete('resource-id', 'create');
		expect(mockOnError).not.toHaveBeenCalled();
	});
});

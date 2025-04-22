import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import { Text } from 'ink';
import InitWizardComponent from '../../../source/components/init/InitWizardComponent.js';

// Create storage for component callbacks
const callbacks = {
	policy: {
		onComplete: null,
		onError: null,
	},
	dataSetup: {
		onComplete: null,
		onError: null,
	},
	assignRole: {
		onComplete: null,
		onError: null,
		users: null,
	},
	enforce: {
		onComplete: null,
		onError: null,
	},
	implement: {
		onComplete: null,
		onError: null,
	},
};

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(code => {
	throw new Error(`process.exit(${code})`);
});

// Mock all child components
vi.mock('../../../source/components/init/PolicyStepComponent.js', () => ({
	default: ({ onComplete, onError }) => {
		// Store callbacks for later use in tests
		callbacks.policy.onComplete = onComplete;
		callbacks.policy.onError = onError;
		return <Text>PolicyStepComponent</Text>;
	},
}));

vi.mock('../../../source/components/init/DataSetupComponent.js', () => ({
	default: ({ apiKey, onComplete, onError }) => {
		// Store props for testing
		callbacks.dataSetup.apiKey = apiKey;
		callbacks.dataSetup.onComplete = onComplete;
		callbacks.dataSetup.onError = onError;
		return <Text>DataSetupComponent</Text>;
	},
}));

vi.mock('../../../source/components/init/AssignRoleComponent.js', () => ({
	default: ({ users, onComplete, onError }) => {
		callbacks.assignRole.users = users;
		callbacks.assignRole.onComplete = onComplete;
		callbacks.assignRole.onError = onError;
		return <Text>AssignRoleComponent</Text>;
	},
}));

vi.mock('../../../source/components/init/EnforceComponent.js', () => ({
	default: ({ onComplete, onError }) => {
		callbacks.enforce.onComplete = onComplete;
		callbacks.enforce.onError = onError;
		return <Text>EnforceComponent</Text>;
	},
}));

vi.mock('../../../source/components/init/ImplementComponent.js', () => ({
	default: ({ action, resource, user, apiKey, onComplete, onError }) => {
		callbacks.implement.action = action;
		callbacks.implement.resource = resource;
		callbacks.implement.user = user;
		callbacks.implement.apiKey = apiKey;
		callbacks.implement.onComplete = onComplete;
		callbacks.implement.onError = onError;
		return <Text>ImplementComponent</Text>;
	},
}));

// Mock ink-spinner
vi.mock('ink-spinner', () => ({
	default: () => <Text>spinner</Text>,
}));

describe('InitWizardComponent', () => {
	const mockOptions = {
		apiKey: 'test-api-key',
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();

		// Reset callbacks between tests
		Object.keys(callbacks).forEach(key => {
			callbacks[key] = {};
		});
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it('should render the initial PolicyStepComponent', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		expect(lastFrame()).toContain('PolicyStepComponent');
		expect(callbacks.policy.onComplete).toBeDefined();
		expect(callbacks.policy.onError).toBeDefined();
	});

	it('should transition from policy to dataSetup step', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Trigger completion of policy step
		callbacks.policy.onComplete('read', 'document');

		// Component should now show DataSetupComponent
		expect(lastFrame()).toContain('DataSetupComponent');
		expect(callbacks.dataSetup.apiKey).toBe('test-api-key');
		expect(callbacks.dataSetup.onComplete).toBeDefined();
		expect(callbacks.dataSetup.onError).toBeDefined();
	});

	it('should transition from dataSetup to assignRole step', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Progress to dataSetup step first
		callbacks.policy.onComplete('read', 'document');

		// Trigger completion of dataSetup step with users list
		callbacks.dataSetup.onComplete({
			userId: 'test-user',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			users: ['test-user', 'another-user'],
		});

		// Component should now show AssignRoleComponent
		expect(lastFrame()).toContain('AssignRoleComponent');
		expect(callbacks.assignRole.users).toEqual(['test-user', 'another-user']);
		expect(callbacks.assignRole.onComplete).toBeDefined();
		expect(callbacks.assignRole.onError).toBeDefined();
	});

	it('should transition from assignRole to enforce step', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Progress through the steps
		callbacks.policy.onComplete('read', 'document');
		callbacks.dataSetup.onComplete({
			userId: 'test-user',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			users: ['test-user'],
		});
		callbacks.assignRole.onComplete();

		// Component should now show EnforceComponent
		expect(lastFrame()).toContain('EnforceComponent');
		expect(callbacks.enforce.onComplete).toBeDefined();
		expect(callbacks.enforce.onError).toBeDefined();
	});

	it('should transition from enforce to implement step', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Progress through the steps
		callbacks.policy.onComplete('read', 'document');
		callbacks.dataSetup.onComplete({
			userId: 'test-user',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			users: ['test-user'],
		});
		callbacks.assignRole.onComplete();
		callbacks.enforce.onComplete();

		// Component should now show ImplementComponent
		expect(lastFrame()).toContain('ImplementComponent');
		expect(callbacks.implement.action).toBe('read');
		expect(callbacks.implement.resource).toBe('document');
		expect(callbacks.implement.user).toEqual({
			userId: 'test-user',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			users: ['test-user'],
		});
		expect(callbacks.implement.apiKey).toBe('test-api-key');
		expect(callbacks.implement.onComplete).toBeDefined();
		expect(callbacks.implement.onError).toBeDefined();
	});

	it('should show completion screen after implement step', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Progress through all steps
		callbacks.policy.onComplete('read', 'document');
		callbacks.dataSetup.onComplete({
			userId: 'test-user',
			users: ['test-user'],
		});
		callbacks.assignRole.onComplete();
		callbacks.enforce.onComplete();
		callbacks.implement.onComplete();

		expect(lastFrame()).toContain('Setup Completed!');
	});

	it('should show error state when any step fails', () => {
		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		// Trigger an error in the policy step
		callbacks.policy.onError('Policy configuration failed');

		expect(lastFrame()).toContain('Error: Policy configuration failed');
	});

	it('should handle errors at different steps', () => {
		const testCases = [
			{
				step: 'dataSetup',
				errorMessage: 'Data setup failed',
				trigger: callbacks => callbacks.dataSetup.onError('Data setup failed'),
				setupFunction: () => {
					callbacks.policy.onComplete('read', 'document');
				},
			},
			{
				step: 'assignRole',
				errorMessage: 'Role assignment failed',
				trigger: callbacks =>
					callbacks.assignRole.onError('Role assignment failed'),
				setupFunction: () => {
					callbacks.policy.onComplete('read', 'document');
					callbacks.dataSetup.onComplete({
						userId: 'test-user',
						users: ['test-user'],
					});
				},
			},
			{
				step: 'enforce',
				errorMessage: 'Enforcement failed',
				trigger: callbacks => callbacks.enforce.onError('Enforcement failed'),
				setupFunction: () => {
					callbacks.policy.onComplete('read', 'document');
					callbacks.dataSetup.onComplete({
						userId: 'test-user',
						users: ['test-user'],
					});
					callbacks.assignRole.onComplete();
				},
			},
			{
				step: 'implement',
				errorMessage: 'Implementation failed',
				trigger: callbacks =>
					callbacks.implement.onError('Implementation failed'),
				setupFunction: () => {
					callbacks.policy.onComplete('read', 'document');
					callbacks.dataSetup.onComplete({
						userId: 'test-user',
						users: ['test-user'],
					});
					callbacks.assignRole.onComplete();
					callbacks.enforce.onComplete();
				},
			},
		];

		for (const testCase of testCases) {
			// Reset for each test case
			cleanup();

			const { lastFrame } = render(
				<InitWizardComponent options={mockOptions} />,
			);

			// Setup to reach the step we want to test
			testCase.setupFunction();

			// Trigger the error for this step
			testCase.trigger(callbacks);

			expect(lastFrame()).toContain(`Error: ${testCase.errorMessage}`);
		}
	});

	it('should render null for an unknown state', () => {
		// Mock useState to force an unknown state
		const originalUseState = React.useState;
		const mockUseState = vi.spyOn(React, 'useState');

		// Set to an invalid state that doesn't match any of our conditionals
		mockUseState.mockImplementationOnce(() => ['unknown', vi.fn()]);
		mockUseState.mockImplementation(originalUseState);

		const { lastFrame } = render(<InitWizardComponent options={mockOptions} />);

		expect(lastFrame()).toBe('PolicyStepComponent');

		// Clean up
		mockUseState.mockRestore();
	});
});

import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import { Text } from 'ink';
import InitWizardComponent from '../../../source/components/init/InitWizardComponent.js';

// Create storage for component callbacks
const callbacks = {
	policy: {
		onComplete: null as any,
		onError: null as any,
	},
	dataSetup: {
		onComplete: null as any,
		onError: null as any,
		apiKey: null as any,
	},
	enforce: {
		onComplete: null as any,
		onError: null as any,
	},
	implement: {
		onComplete: null as any,
		onError: null as any,
		action: null as any,
		resource: null as any,
		user: null as any,
		apiKey: null as any,
	},
};

// Mock process.exit and timers
const mockExit = vi.spyOn(process, 'exit').mockImplementation(code => {
	throw new Error(`process.exit(${code})`);
});

// Mock child components
vi.mock('../../../source/components/init/PolicyStepComponent.js', () => ({
	default: ({ onComplete, onError }) => {
		callbacks.policy.onComplete = onComplete;
		callbacks.policy.onError = onError;
		return <Text>PolicyStepComponent</Text>;
	},
}));

vi.mock('../../../source/components/init/DataSetupComponent.js', () => ({
	default: ({ apiKey, onComplete, onError }) => {
		callbacks.dataSetup.apiKey = apiKey;
		callbacks.dataSetup.onComplete = onComplete;
		callbacks.dataSetup.onError = onError;
		return <Text>DataSetupComponent</Text>;
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
	default: () => <Text>Spinner</Text>,
}));

describe('InitWizardComponent', () => {
	const mockOptions = {
		apiKey: 'test-api-key',
	};

	const mockUser = {
		userId: 'test-user',
		firstName: 'Test',
		lastName: 'User',
		email: 'test@example.com',
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		Object.keys(callbacks).forEach(key => {
			callbacks[key as keyof typeof callbacks] = {};
		});
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	describe('Step Transitions', () => {
		it('should transition through all steps correctly', () => {
			const { lastFrame } = render(
				<InitWizardComponent options={mockOptions} />,
			);

			// Initial state
			expect(lastFrame()).toContain('PolicyStepComponent');

			// Policy -> DataSetup
			callbacks.policy.onComplete('read', 'document');
			expect(lastFrame()).toContain('DataSetupComponent');

			// DataSetup -> Enforce
			callbacks.dataSetup.onComplete(mockUser);
			expect(lastFrame()).toContain('EnforceComponent');

			// Enforce -> Implement
			callbacks.enforce.onComplete();
			expect(lastFrame()).toContain('ImplementComponent');

			// Implement -> Done
			callbacks.implement.onComplete();
			expect(lastFrame()).toContain('Setup Completed!');
		});
	});

	describe('Data Flow', () => {
		it('should pass data correctly between steps', () => {
			render(<InitWizardComponent options={mockOptions} />);

			// Complete policy step
			callbacks.policy.onComplete('read', 'document');
			expect(callbacks.dataSetup.apiKey).toBe('test-api-key');

			// Complete data setup
			callbacks.dataSetup.onComplete(mockUser);

			// Complete enforce step
			callbacks.enforce.onComplete();

			// Verify implement step received correct data
			expect(callbacks.implement.action).toBe('read');
			expect(callbacks.implement.resource).toBe('document');
			expect(callbacks.implement.user).toEqual(mockUser);
			expect(callbacks.implement.apiKey).toBe('test-api-key');
		});
	});
});

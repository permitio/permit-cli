import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import Create from '../source/commands/env/create';
import * as AuthProvider from '../source/components/AuthProvider';
import * as CreateEnvComponent from '../source/components/env/CreateEnvComponent';

// Mock the components
vi.mock('../source/components/AuthProvider', () => ({
	AuthProvider: vi.fn(({ children }) => children),
}));

vi.mock('../source/components/env/CreateEnvComponent', () => ({
	default: vi.fn(() => <div>Mocked CreateEnvComponent</div>),
}));

describe('env create command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with default options', () => {
		const options = {
			apiKey: undefined,
			name: undefined,
			envKey: undefined,
			description: undefined,
		};

		render(<Create options={options} />);

		// Check AuthProvider was called with correct props
		expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				permit_key: undefined,
				scope: 'project',
			}),
			expect.anything(),
		);

		// Check CreateEnvComponent was called with the right first argument
		expect(CreateEnvComponent.default).toHaveBeenNthCalledWith(
			1,
			{
				name: undefined,
				envKey: undefined,
				description: undefined,
			},
			expect.anything(),
		);
	});

	it('passes options correctly to CreateEnvComponent', () => {
		const options = {
			apiKey: 'test-key',
			name: 'Test Environment',
			envKey: 'test_env',
			description: 'Test description',
		};

		render(<Create options={options} />);

		// Check AuthProvider was called with correct props
		expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				permit_key: 'test-key',
				scope: 'project',
			}),
			expect.anything(),
		);

		// Check CreateEnvComponent was called with the right first argument
		expect(CreateEnvComponent.default).toHaveBeenNthCalledWith(
			1,
			{
				name: 'Test Environment',
				envKey: 'test_env',
				description: 'Test description',
			},
			expect.anything(),
		);
	});
});

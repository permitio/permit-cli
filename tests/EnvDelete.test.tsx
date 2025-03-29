import React from 'react';
import { render } from 'ink-testing-library';
import { describe, vi, expect, it, beforeEach } from 'vitest';
import Delete from '../source/commands/env/delete';
import * as AuthProvider from '../source/components/AuthProvider';
import * as DeleteComponent from '../source/components/env/DeleteComponent';

// Mock the components
vi.mock('../source/components/AuthProvider', () => ({
	AuthProvider: vi.fn(({ children }) => children),
}));

vi.mock('../source/components/env/DeleteComponent', () => ({
	default: vi.fn(() => <div>Mocked DeleteComponent</div>),
}));

describe('env delete command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with default options', () => {
		const options = {
			apiKey: undefined,
			envId: undefined,
			force: false,
		};

		render(<Delete options={options} />);

		// Check AuthProvider was called with correct props
		expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				permit_key: undefined,
				scope: 'project',
			}),
			expect.anything(),
		);

		// Check DeleteComponent was called with correct props
		expect(DeleteComponent.default).toHaveBeenNthCalledWith(
			1,
			{
				environmentId: undefined,
				force: false,
			},
			expect.anything(),
		);
	});

	it('passes options correctly to DeleteComponent', () => {
		const options = {
			apiKey: 'test-key',
			envId: 'env456',
			force: true,
		};

		render(<Delete options={options} />);

		// Check AuthProvider was called with correct props
		expect(AuthProvider.AuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				permit_key: 'test-key',
				scope: 'project',
			}),
			expect.anything(),
		);

		// Check DeleteComponent was called with correct props
		expect(DeleteComponent.default).toHaveBeenNthCalledWith(
			1,
			{
				environmentId: 'env456',
				force: true,
			},
			expect.anything(),
		);
	});
});

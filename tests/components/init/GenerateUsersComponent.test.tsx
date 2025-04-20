import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import GenerateUsersComponent from '../../../source/components/init/GenerateUsersComponent.js';
import { useGeneratePolicySnapshot } from '../../../source/components/test/hooks/usePolicySnapshot.js';
import { vi, describe, it, expect } from 'vitest';
import { type Mock } from 'vitest';

vi.mock('../../../source/components/test/hooks/usePolicySnapshot.js', () => ({
	useGeneratePolicySnapshot: vi.fn(() => ({
		state: 'processing',
		error: null,
		dryUsers: ['user-1'],
	})),
}));
describe('GenerateUsersComponent', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();
	const mockUseGeneratePolicySnapshot = useGeneratePolicySnapshot as Mock;
	it('renders without crashing', () => {
		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		expect(lastFrame()).toContain('Generating users...');
	});

	it('handles errors correctly', async () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'error',
			error: 'An error occurred',
			dryUsers: [],
		});
		render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 50)); // Wait for useEffect to run
		expect(mockOnError).toHaveBeenCalled();
		expect(mockOnComplete).not.toHaveBeenCalled();
	});
	it('calls onComplete with user data', async () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'done',
			error: null,
			dryUsers: [{ key: 'user-1' }],
		});
		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);
		await new Promise(resolve => setTimeout(resolve, 50)); // Wait for useEffect to run
		expect(mockOnComplete).toHaveBeenCalledWith({
			userId: 'user-1',
			firstName: undefined,
			lastName: undefined,
			email: undefined,
		});
		expect(lastFrame()).toContain('Generated 1 users');
	});
});

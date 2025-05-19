import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import GenerateUsersComponent from '../../../source/components/init/GenerateUsersComponent.js';
import { useGeneratePolicyRBACSnapshot } from '../../../source/components/test/hooks/usePolicyRBACSnapshot.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type Mock } from 'vitest';

// Store the SelectInput callback for testing
let selectInputCallback:
	| ((item: { label: string; value: string }) => void)
	| null = null;

// Mock the SelectInput component
vi.mock('ink-select-input', () => ({
	default: ({
		items,
		onSelect,
	}: {
		items: Array<{ label: string; value: string }>;
		onSelect: (item: { label: string; value: string }) => void;
	}) => {
		// Store the callback for later use in tests
		selectInputCallback = onSelect;
		return <span>Continue</span>; // Render something simple that will appear in the output
	},
}));

// Mock the useRBACPolicySnapshot hook
vi.mock(
	'../../../source/components/test/hooks/usePolicyRBACSnapshot.js',
	() => ({
		useGeneratePolicySnapshot: vi.fn(),
	}),
);

describe('GenerateUsersComponent', () => {
	const mockOnComplete = vi.fn();
	const mockOnError = vi.fn();
	const mockUseGeneratePolicySnapshot = useGeneratePolicyRBACSnapshot as Mock;

	beforeEach(() => {
		vi.resetAllMocks();
		selectInputCallback = null; // Reset the callback between tests

		// Default mock implementation
		mockUseGeneratePolicySnapshot.mockReturnValue({
			state: 'roles',
			error: null,
			createdUsers: [],
			tenantId: 'test-tenant-123',
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('renders loading state', () => {
		// Test when loading roles
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'roles',
			error: null,
			createdUsers: [],
			tenantId: undefined,
		});

		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Generating users...');
	});

	it('renders rbac-tenant state correctly', () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'rbac-tenant',
			error: null,
			createdUsers: [],
			tenantId: undefined,
		});

		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Generating users...');
	});

	it('renders rbac-users state correctly', () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'rbac-users',
			error: null,
			createdUsers: [],
			tenantId: 'tenant-123',
		});

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
			state: 'done',
			error: 'An error occurred',
			createdUsers: [],
			tenantId: 'tenant-123',
		});

		render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		await new Promise(resolve => setTimeout(resolve, 50)); // Wait for useEffect to run

		expect(mockOnError).toHaveBeenCalledWith('An error occurred');
		expect(mockOnComplete).not.toHaveBeenCalled();
	});

	it('renders user list when users are generated', () => {
		// Mock a successful generation with users
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'done',
			error: null,
			createdUsers: [
				{
					key: 'johndoe',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
					roles: ['admin'],
				},
				{
					key: 'janedoe',
					firstName: 'Jane',
					lastName: 'Doe',
					email: 'jane@example.com',
					roles: ['user'],
				},
			],
			tenantId: 'tenant-abc',
		});

		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Generated 2 users in Tenant tenant-abc:');
		expect(lastFrame()).toContain(
			'1. johndoe (John Doe) - john@example.com (primary)',
		);
		expect(lastFrame()).toContain('2. janedoe (Jane Doe) - jane@example.com');
	});

	it('formats user info correctly with partial data', () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'done',
			error: null,
			createdUsers: [
				{
					key: 'user1',
					firstName: '',
					lastName: '',
					email: '',
					roles: [],
				},
				{
					key: 'user2',
					firstName: 'Only',
					lastName: '',
					email: '',
					roles: [],
				},
				{
					key: 'user3',
					firstName: '',
					lastName: '',
					email: 'only@email.com',
					roles: [],
				},
			],
			tenantId: 'tenant-test',
		});

		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('1. user1 (primary)');
		expect(lastFrame()).toContain('2. user2 (Only)');
		expect(lastFrame()).toContain('3. user3 - only@email.com');
	});

	it('handles empty user list in done state', () => {
		mockUseGeneratePolicySnapshot.mockReturnValueOnce({
			state: 'done',
			error: null,
			createdUsers: [],
			tenantId: 'tenant-empty',
		});

		const { lastFrame } = render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		expect(lastFrame()).toContain('Generated 0 users');
		expect(lastFrame()).toContain('No users generated');
		// Continue button shouldn't appear with empty users
		expect(lastFrame()).not.toContain('Continue');
	});

	it('calls onComplete with correct user data when continue is selected', async () => {
		const testUsers = [
			{
				key: 'user123',
				firstName: 'Test',
				lastName: 'User',
				email: 'test@example.com',
				roles: ['admin'],
			},
			{
				key: 'user456',
				firstName: 'Another',
				lastName: 'User',
				email: 'another@example.com',
				roles: ['user'],
			},
		];

		mockUseGeneratePolicySnapshot.mockReturnValue({
			state: 'done',
			error: null,
			createdUsers: testUsers,
			tenantId: 'tenant-123',
		});

		render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to render and useEffect to run
		await new Promise(resolve => setTimeout(resolve, 50));

		// Call the continue callback
		if (selectInputCallback) {
			selectInputCallback({ label: 'Continue', value: 'continue' });
		}

		expect(mockOnComplete).toHaveBeenCalledWith({
			userId: 'user123',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			users: ['user123', 'user456'],
		});
	});

	it('prevents multiple calls to onComplete', async () => {
		mockUseGeneratePolicySnapshot.mockReturnValue({
			state: 'done',
			error: null,
			createdUsers: [
				{
					key: 'user123',
					firstName: 'Test',
					lastName: 'User',
					email: 'test@example.com',
					roles: [],
				},
			],
			tenantId: 'tenant-123',
		});

		render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Wait for component to render
		await new Promise(resolve => setTimeout(resolve, 50));

		// Call the callback directly, twice
		if (selectInputCallback) {
			selectInputCallback({ label: 'Continue', value: 'continue' });
			selectInputCallback({ label: 'Continue', value: 'continue' });
		}

		// Should only be called once
		expect(mockOnComplete).toHaveBeenCalledTimes(1);
	});

	it('passes correct snapshot options to useRBACPolicySnapshot', () => {
		render(
			<GenerateUsersComponent
				onComplete={mockOnComplete}
				onError={mockOnError}
			/>,
		);

		// Check that the hook was called with the correct options
		expect(mockUseGeneratePolicySnapshot).toHaveBeenCalledWith({
			dryRun: false, // Updated to match component implementation
			models: ['RBAC'],
			isTestTenant: false,
		});
	});
});

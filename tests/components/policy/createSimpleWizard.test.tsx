import React from 'react';
import { render } from 'ink-testing-library';
import CreateSimpleWizard from '../../../source/components/policy/CreateSimpleWizard';
import { useAuth } from '../../../source/components/AuthProvider.js';
import { useResourcesApi } from '../../../source/hooks/useResourcesApi.js';
import { useRolesApi } from '../../../source/hooks/useRolesApi.js';
import { ResourceInput } from '../../../source/components/policy/ResourceInput.js';
import { ActionInput } from '../../../source/components/policy/ActionsInput.js';
import { RoleInput } from '../../../source/components/policy/RoleInput.js';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import { Text } from 'ink';

// Mock the hooks and components
vi.mock('../../../source/components/AuthProvider.js', () => ({
	useAuth: vi.fn(),
}));

vi.mock('../../../source/hooks/useResourcesApi.js', () => ({
	useResourcesApi: vi.fn(),
}));

vi.mock('../../../source/hooks/useRolesApi.js', () => ({
	useRolesApi: vi.fn(),
}));

vi.mock('../../../source/components/policy/ResourceInput.js', () => ({
	ResourceInput: vi.fn(() => <Text>ResourceInput Mock</Text>),
}));

vi.mock('../../../source/components/policy/ActionsInput.js', () => ({
	ActionInput: vi.fn(() => <Text>ActionInput Mock</Text>),
}));

vi.mock('../../../source/components/policy/RoleInput.js', () => ({
	RoleInput: vi.fn(() => <Text>RoleInput Mock</Text>),
}));

// Mock process.exit
const mockExit = vi
	.spyOn(process, 'exit')
	.mockImplementation(() => undefined as never);

describe('CreateSimpleWizard', () => {
	const apiKey = 'test-api-key';
	const projectId = 'test-project-id';
	const environmentId = 'test-env-id';
	const mockCreateBulkResources = vi.fn();
	const mockCreateBulkRoles = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mocks
		vi.mocked(useAuth).mockReturnValue({
			scope: {
				organization_id: 'test-org-id',
				project_id: projectId,
				environment_id: environmentId,
			},
		});

		vi.mocked(useResourcesApi).mockReturnValue({
			createBulkResources: mockCreateBulkResources,
		});

		vi.mocked(useRolesApi).mockReturnValue({
			createBulkRoles: mockCreateBulkRoles,
		});
	});

	it('initially renders the ResourceInput component', () => {
		render(<CreateSimpleWizard />);

		expect(ResourceInput).toHaveBeenCalledWith(
			expect.objectContaining({
				onComplete: expect.any(Function),
			}),
			expect.anything(),
		);
	});

	it('transitions from resources to actions step when resources are completed', () => {
		render(<CreateSimpleWizard />);

		// Extract the onComplete handler from ResourceInput
		const onCompleteResources =
			vi.mocked(ResourceInput).mock.calls[0][0].onComplete;

		// Call onComplete with sample resources
		const sampleResources = [
			{ key: 'resource1', name: 'Resource 1', actions: {} },
		];
		onCompleteResources(sampleResources);

		// Verify ActionInput is now rendered
		expect(ActionInput).toHaveBeenCalledWith(
			expect.objectContaining({
				onComplete: expect.any(Function),
				availableResources: ['resource1'],
			}),
			expect.anything(),
		);
	});

	it('transitions from actions to roles step when actions are completed', () => {
		render(<CreateSimpleWizard />);

		// First complete the resources step
		const onCompleteResources =
			vi.mocked(ResourceInput).mock.calls[0][0].onComplete;
		const sampleResources = [
			{ key: 'resource1', name: 'Resource 1', actions: {} },
		];
		onCompleteResources(sampleResources);

		// Now complete the actions step
		const onCompleteActions =
			vi.mocked(ActionInput).mock.calls[0][0].onComplete;
		const sampleActions = { read: { name: 'Read' } };
		onCompleteActions(sampleActions);

		// Verify RoleInput is now rendered
		expect(RoleInput).toHaveBeenCalledWith(
			expect.objectContaining({
				availableActions: ['read'],
				availableResources: ['resource1'],
				onComplete: expect.any(Function),
			}),
			expect.anything(),
		);
	});

	it('displays processing message when submitting role data', () => {
		const { lastFrame } = render(<CreateSimpleWizard />);

		// Go through the workflow to roles
		const onCompleteResources =
			vi.mocked(ResourceInput).mock.calls[0][0].onComplete;
		onCompleteResources([
			{ key: 'resource1', name: 'Resource 1', actions: {} },
		]);

		const onCompleteActions =
			vi.mocked(ActionInput).mock.calls[0][0].onComplete;
		onCompleteActions({ read: { name: 'Read' } });

		// Setup a promise that won't resolve immediately
		mockCreateBulkResources.mockReturnValue(new Promise(() => {}));
		mockCreateBulkRoles.mockReturnValue(new Promise(() => {}));

		// Complete the role step
		const onCompleteRoles = vi.mocked(RoleInput).mock.calls[0][0].onComplete;
		onCompleteRoles([{ name: 'admin', key: 'admin' }]);

		// Check for processing message
		expect(lastFrame()).toContain('Processing your request...');
	});

	it('handles API errors during role submission', async () => {
		const { lastFrame } = render(<CreateSimpleWizard apiKey={apiKey} />);

		// Go through the workflow to roles
		const onCompleteResources =
			vi.mocked(ResourceInput).mock.calls[0][0].onComplete;
		onCompleteResources([
			{ key: 'resource1', actions: {}, name: 'Resource 1' },
		]);

		const onCompleteActions =
			vi.mocked(ActionInput).mock.calls[0][0].onComplete;
		onCompleteActions({ read: { name: 'Read' } });

		// Setup API to throw an error
		const apiError = new Error('API failure');
		mockCreateBulkResources.mockRejectedValueOnce(apiError);

		// Complete the role step
		const onCompleteRoles = vi.mocked(RoleInput).mock.calls[0][0].onComplete;
		await onCompleteRoles([{ name: 'admin', key: 'admin' }]);

		// Check for error message
		expect(lastFrame()).toContain(
			'[Error] Failed to create policy: API failure',
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('shows success message when APIs complete successfully', async () => {
		const { lastFrame } = render(<CreateSimpleWizard />);

		// Go through the workflow to roles
		const onCompleteResources =
			vi.mocked(ResourceInput).mock.calls[0][0].onComplete;
		onCompleteResources([
			{ key: 'resource1', name: 'Resource 1', actions: {} },
		]);

		const onCompleteActions =
			vi.mocked(ActionInput).mock.calls[0][0].onComplete;
		onCompleteActions({ read: { name: 'Read' } });

		// Setup APIs to succeed
		mockCreateBulkResources.mockResolvedValueOnce({});
		mockCreateBulkRoles.mockResolvedValueOnce({});

		// Complete the role step
		const onCompleteRoles = vi.mocked(RoleInput).mock.calls[0][0].onComplete;
		await onCompleteRoles([{ name: 'admin', key: 'admin' }]);

		// Check for success message
		expect(lastFrame()).toContain(
			'[Success] Policy table created successfully',
		);
		expect(mockExit).toHaveBeenCalledWith(0);

		// Verify API calls were made with correct data
		expect(mockCreateBulkResources).toHaveBeenCalledWith([
			expect.objectContaining({
				key: 'resource1',
				actions: { read: { name: 'Read' } },
			}),
		]);

		expect(mockCreateBulkRoles).toHaveBeenCalledWith([
			{ name: 'admin', key: 'admin' },
		]);
	});
});

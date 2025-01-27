import React from 'react';
import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SignupComponent from '../../source/components/signup/SignupComponent.js';
import { useOrganisationApi } from '../../source/hooks/useOrganisationApi.js';
import delay from 'delay';
import '../../source/i18n.ts';

vi.mock('../../source/hooks/useOrganisationApi.js', () => ({
	useOrganisationApi: vi.fn(() => ({
		createOrg: vi.fn(),
	})),
}));

const enter = '\r';

describe('SignupComponent', () => {
	let mockOnSuccess: () => void;
	let mockCreateOrg: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnSuccess = vi.fn();
		mockCreateOrg = vi.fn();
		(useOrganisationApi as jest.Mock).mockReturnValue({ createOrg: mockCreateOrg });
	});

	it('should display the default organization name and allow confirmation', async () => {
		const { lastFrame, stdin } = render(
			<SignupComponent
				accessToken="mock-access-token"
				onSuccess={mockOnSuccess}
			/>
		);

		expect(lastFrame()).toMatch(/Welcome! Create your Workspace/);
		expect(lastFrame()).toMatch(/Use the default organization name:/);

		// Confirm the default organization name
		stdin.write('y');
		stdin.write(enter);
		await delay(50);

	});

	it('should allow the user to enter a custom organization name', async () => {

		mockCreateOrg.mockResolvedValue({ error: null });

		const { lastFrame, stdin } = render(
			<SignupComponent
				accessToken="mock-access-token"
				onSuccess={mockOnSuccess}
			/>
		);

		expect(lastFrame()).toMatch(/Welcome! Create your Workspace/);
		await delay(50);
		// Cancel the default name confirmation
		stdin.write('n');
		// stdin.write(enter);
		await delay(50);

		expect(lastFrame()).toMatch(/Enter your organization name/);

		// Submit a custom name
		const customName = 'custom-org';
		stdin.write(customName);
		stdin.write(enter);
		await delay(50);

	});

	it('should display a spinner while creating an organization', async () => {
		mockCreateOrg.mockImplementation(() => new Promise(() => {})); // Never resolve
		const { lastFrame, stdin } = render(
			<SignupComponent
				accessToken="mock-access-token"
				onSuccess={mockOnSuccess}
			/>
		);

		// Confirm the default organization name
		await delay(50);
		stdin.write('y');
		// stdin.write(enter);
		await delay(50);

		expect(lastFrame()).toMatch(/Creating your organization/);
	});

	it('should handle errors and display an error message', async () => {
		mockCreateOrg.mockResolvedValue({ error: 'Mock error' });

		const { lastFrame, stdin } = render(
			<SignupComponent
				accessToken="mock-access-token"
				onSuccess={mockOnSuccess}
			/>
		);

		// Confirm the default organization name
		await delay(50);
		stdin.write('y');
		// stdin.write(enter);
		await delay(50);

		expect(lastFrame()).toMatch(/Mock error/);
	});

	it('should call onSuccess after successful organization creation', async () => {
		mockCreateOrg.mockResolvedValue({ error: null });

		const { stdin } = render(
			<SignupComponent
				accessToken="mock-access-token"
				onSuccess={mockOnSuccess}
			/>
		);

		// Confirm the default organization name
		await delay(50);
		stdin.write('y');
		await delay(50);

		expect(mockOnSuccess).toHaveBeenCalledOnce();
	});
});

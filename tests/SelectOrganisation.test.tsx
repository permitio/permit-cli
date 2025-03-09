import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import SelectOrganization from '../source/components/SelectOrganization.js';
import { useOrganisationApi } from '../source/hooks/useOrganisationApi.js';
import delay from 'delay';

vi.mock('../source/hooks/useOrganisationApi.js', () => ({
	useOrganisationApi: vi.fn(),
}));

const enter = '\r';
const arrowDown = '\u001B[B';

describe('SelectOrganization Component', () => {
	it('should display loading state initially', () => {
		const mockGetOrgs = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'org1', name: 'OrganizationReadWithAPIKey 1' },
					{ id: 'org2', name: 'OrganizationReadWithAPIKey 2' },
				],
				error: null,
			}),
		);
		(useOrganisationApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getOrgs: mockGetOrgs,
		});

		const { lastFrame } = render(
			<SelectOrganization
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={vi.fn()}
				onError={vi.fn()}
			/>,
		);

		expect(lastFrame()).toMatch(/Loading Organizations.../);
	});

	it('should display organizations after loading', async () => {
		const mockGetOrgs = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'org1', name: 'OrganizationReadWithAPIKey 1' },
					{ id: 'org2', name: 'OrganizationReadWithAPIKey 2' },
				],
				error: null,
			}),
		);
		(useOrganisationApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getOrgs: mockGetOrgs,
		});

		const onComplete = vi.fn();
		const { stdin, lastFrame } = render(
			<SelectOrganization
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={onComplete}
				onError={vi.fn()}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(lastFrame()).toMatch(/Select an organization/);
		expect(lastFrame()).toMatch(/OrganizationReadWithAPIKey 1/);
		expect(lastFrame()).toMatch(/OrganizationReadWithAPIKey 2/);

		// Simulate user input to select the second organization
		stdin.write(arrowDown);
		await delay(50);
		stdin.write(enter);
		await delay(50);

		expect(onComplete).toHaveBeenCalledOnce();
		expect(onComplete).toHaveBeenCalledWith({
			label: 'OrganizationReadWithAPIKey 2',
			value: 'org2',
		});
	});

	it('should handle errors when fetching organizations fails', async () => {
		const mockGetOrgs = vi.fn(() =>
			Promise.resolve({
				data: null,
				error: 'Network error',
			}),
		);
		(useOrganisationApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getOrgs: mockGetOrgs,
		});

		const onError = vi.fn();
		render(
			<SelectOrganization
				accessToken="test_token"
				cookie="test_cookie"
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(
			'Failed to load organizations. Reason: Network error. Please check your network connection or credentials and try again.',
		);
	});

	it('should automatically select organization if workspace is specified and matches', async () => {
		const mockGetOrgs = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'org1', name: 'OrganizationReadWithAPIKey 1' },
					{ id: 'org2', name: 'OrganizationReadWithAPIKey 2' },
				],
				error: null,
			}),
		);
		(useOrganisationApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getOrgs: mockGetOrgs,
		});

		const onComplete = vi.fn();
		const { lastFrame } = render(
			<SelectOrganization
				accessToken="test_token"
				cookie="test_cookie"
				workspace="OrganizationReadWithAPIKey 1"
				onComplete={onComplete}
				onError={vi.fn()}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(onComplete).toHaveBeenCalledOnce();
		expect(onComplete).toHaveBeenCalledWith({
			label: 'OrganizationReadWithAPIKey 1',
			value: 'org1',
		});
		expect(lastFrame()).not.toMatch(/Select an organization/);
	});

	it('should display an error if workspace is specified but not found', async () => {
		const mockGetOrgs = vi.fn(() =>
			Promise.resolve({
				data: [
					{ id: 'org1', name: 'OrganizationReadWithAPIKey 1' },
					{ id: 'org2', name: 'OrganizationReadWithAPIKey 2' },
				],
				error: null,
			}),
		);
		(useOrganisationApi as ReturnType<typeof vi.fn>).mockReturnValue({
			getOrgs: mockGetOrgs,
		});

		const onError = vi.fn();
		const { lastFrame } = render(
			<SelectOrganization
				accessToken="test_token"
				cookie="test_cookie"
				workspace="Unknown OrganizationReadWithAPIKey"
				onComplete={vi.fn()}
				onError={onError}
			/>,
		);

		await delay(50); // Allow async operation to complete

		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(
			'Organization "Unknown OrganizationReadWithAPIKey" not found. Please ensure the name is correct and try again.',
		);
		expect(lastFrame()).not.toMatch(/Select an organization/);
	});
});

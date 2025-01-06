import { useOrganisationApi } from '../../source/hooks/useOrganisationApi';
import { apiCall } from '../../source/lib/api';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// Mocking the apiCall function
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

describe('useOrganisationApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch all organizations', async () => {
		const TestComponent = () => {
			const { getOrgs } = useOrganisationApi();
			const accessToken = 'access-token';
			const cookie = 'cookie';

			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue([
				{
					key: 'org-key',
					id: 'org-id',
					is_enterprise: false,
					usage_limits: { mau: 100, tenants: 10, billing_tier: 'standard' },
					created_at: '2024-01-01',
					updated_at: '2024-01-02',
					name: 'Organization Name',
					settings: {},
				},
			]);

			const fetchOrgs = async () => {
				const orgs = await getOrgs(accessToken, cookie);
				return orgs.length > 0 ? orgs[0].name : 'No organizations';
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrgs().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Organization Name');
		});
	});

	it('should handle failure to fetch organizations', async () => {
		const TestComponent = () => {
			const { getOrgs } = useOrganisationApi();
			const accessToken = 'access-token';
			const cookie = 'cookie';

			// Mock the apiCall to simulate a failed response
			apiCall.mockRejectedValue(new Error('Failed to fetch organizations'));

			const fetchOrgs = async () => {
				try {
					const orgs = await getOrgs(accessToken, cookie);
					return orgs.length > 0 ? orgs[0].name : 'No organizations';
				} catch (error) {
					return error.message;
				}
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrgs().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to fetch organizations');
		});
	});

	it('should fetch a single organization', async () => {
		const TestComponent = () => {
			const { getOrg } = useOrganisationApi();
			const accessToken = 'access-token';
			const cookie = 'cookie';
			const organizationId = 'org-id';

			// Mock the apiCall to simulate a successful response for a single organization
			apiCall.mockResolvedValue({
				key: 'org-key',
				id: 'org-id',
				is_enterprise: false,
				usage_limits: { mau: 100, tenants: 10, billing_tier: 'standard' },
				created_at: '2024-01-01',
				updated_at: '2024-01-02',
				name: 'Organization Name',
				settings: {},
			});

			const fetchOrg = async () => {
				const org = await getOrg(organizationId, accessToken, cookie);
				return org.name;
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrg().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Organization Name');
		});
	});

	it('should handle failure to fetch a single organization', async () => {
		const TestComponent = () => {
			const { getOrg } = useOrganisationApi();
			const accessToken = 'access-token';
			const cookie = 'cookie';
			const organizationId = 'org-id';

			// Mock the apiCall to simulate a failed response for a single organization
			apiCall.mockRejectedValue(new Error('Failed to fetch organization'));

			const fetchOrg = async () => {
				try {
					const org = await getOrg(organizationId, accessToken, cookie);
					return org.name;
				} catch (error) {
					return error.message;
				}
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrg().then(res => setResult(res));
			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to fetch organization');
		});
	});
});

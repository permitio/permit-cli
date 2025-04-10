import { useOrganisationApi } from '../../source/hooks/useOrganisationApi.js';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';

global.fetch = vi.fn();

describe('useOrganisationApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch all organizations', async () => {
		const TestComponent = () => {
			const { getOrgs } = useOrganisationApi();

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => [
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
				],
			});

			const fetchOrgs = async () => {
				const { data: orgs } = await getOrgs();
				return (orgs?.length ?? 0) > 0 && orgs
					? orgs[0]?.name
					: 'No organizations';
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrgs().then(res => setResult(res ?? null));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Organization Name');
		});
	});

	it('should fetch a single organization', async () => {
		const TestComponent = () => {
			const { getOrg } = useOrganisationApi();
			const organizationId = 'org-id';

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => ({
					key: 'org-key',
					id: 'org-id',
					is_enterprise: false,
					usage_limits: { mau: 100, tenants: 10, billing_tier: 'standard' },
					created_at: '2024-01-01',
					updated_at: '2024-01-02',
					name: 'Organization Name',
					settings: {},
				}),
			});

			const fetchOrg = async () => {
				const { data: org } = await getOrg(organizationId);
				return org?.name;
			};
			const [result, setResult] = React.useState<string | null>(null);
			fetchOrg().then(res => setResult(res ?? null));

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

			(fetch as any).mockRejectedValueOnce(
				new Error('Failed to fetch organizations'),
			);

			const fetchOrgs = async () => {
				try {
					const { data: orgs } = await getOrgs();
					return (orgs?.length ?? 0) > 0 && orgs
						? orgs[0]?.name
						: 'No organizations';
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

	it('should handle failure to fetch a single organization', async () => {
		const TestComponent = () => {
			const { getOrg } = useOrganisationApi();
			const organizationId = 'org-id';

			(fetch as any).mockRejectedValueOnce(
				new Error('Failed to fetch organization'),
			);

			const fetchOrg = async () => {
				try {
					const { data: org } = await getOrg(organizationId);
					return org?.name;
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

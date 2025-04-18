import { vi, describe, beforeEach, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import {
	RoleAssignmentCreate,
	useRolesApi,
} from '../../source/hooks/useRolesApi.js';
import { getMockFetchResponse } from '../utils.js';

global.fetch = vi.fn();

describe('useRolesApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should get roles', async () => {
		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => [
				{ id: 'role-1', name: 'Admin' },
				{ id: 'role-2', name: 'Editor' },
			],
		});

		const TestComponent = () => {
			const { getRoles } = useRolesApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				getRoles().then((res: any) => {
					setResult(res.data.map((r: any) => r.name).join(', '));
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Admin, Editor');
		});
	});

	it('should assign roles', async () => {
		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
				success: true,
			}),
		});

		const TestComponent = () => {
			const { assignRoles } = useRolesApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const body: RoleAssignmentCreate[] = [
					{ user: 'user-1', role: 'role-1' },
					{ user: 'user-2', role: 'role-2' },
				];
				assignRoles(body).then(() => {
					setResult('roles assigned');
				});
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('roles assigned');
		});
	});
});

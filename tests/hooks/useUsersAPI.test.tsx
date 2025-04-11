import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';
import { CreateUserBody, useUserApi } from '../../source/hooks/useUserApi.js';

global.fetch = vi.fn();

describe('useUserApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create user', async () => {
		(fetch as any).mockResolvedValueOnce({
			...getMockFetchResponse(),
			json: async () => ({
				key: 'user-1',
				firstName: 'First',
				lastName: 'Last',
			}),
		});

		const TestComponent = () => {
			const { createUser } = useUserApi();
			const [result, setResult] = React.useState<string | null>(null);

			React.useEffect(() => {
				const create = async () => {
					const body: CreateUserBody = {
						attributes: {},
						key: 'user-1',
						first_name: 'First',
						last_name: 'Last',
					};
					const { data: user } = await createUser(body);
					setResult(user?.key ?? 'User not created');
				};
				create();
			}, []);

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('user-1');
		});
	});
});

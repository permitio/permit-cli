import { useMemberApi } from '../../source/hooks/useMemberApi.js';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { getMockFetchResponse } from '../utils.js';

global.fetch = vi.fn();

describe('useMemberApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should invite a new member successfully', async () => {
		const TestComponent = () => {
			const { inviteNewMember } = useMemberApi();
			const body = {
				email: 'newmember@example.com',
				role: 'member',
			};

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => ({ success: true })
			});

			const inviteMember = async () => {

				const { data: result } = await inviteNewMember(body, 'dummy_name', 'dummy_email');
				return result ? 'Member invited' : 'Failed to invite member';
			};
			const [result, setResult] = React.useState<string | null>(null);
			inviteMember().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Member invited');
		});
	});

	it('should handle failed member invitation', async () => {
		const TestComponent = () => {
			const { inviteNewMember } = useMemberApi();
			const body = {
				email: 'newmember@example.com',
				role: 'member',
			};

			(fetch as any).mockResolvedValueOnce({
				...getMockFetchResponse(),
				json: async () => undefined
			});

			const inviteMember = async () => {
				const { data: result } = await inviteNewMember(body, 'dummy_name', 'dummy_email');
				return result ? 'Member invited' : 'Failed to invite member';

			};
			const [result, setResult] = React.useState<string | null>(null);
			inviteMember().then(res => setResult(res));

			return <Text>{result}</Text>;
		};

		const { lastFrame } = render(<TestComponent />);
		await vi.waitFor(() => {
			expect(lastFrame()).toBe('Failed to invite member');
		});
	});
});

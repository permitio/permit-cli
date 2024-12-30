import { useMemberApi } from '../../source/hooks/useMemberApi';
import { apiCall } from '../../source/lib/api';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// Mocking the apiCall function
vi.mock('../../source/lib/api', () => ({
	apiCall: vi.fn(),
}));

describe('useMemberApi', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should invite a new member successfully', async () => {
		const TestComponent = () => {
			const { inviteNewMember } = useMemberApi();
			const authToken = 'auth-token';
			const body = {
				email: 'newmember@example.com',
				role: 'member',
			};

			// Mock the apiCall to simulate a successful response
			apiCall.mockResolvedValue({ success: true });

			const inviteMember = async () => {
				const result = await inviteNewMember(authToken, body);
				return result.success ? 'Member invited' : 'Failed to invite member';
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
			const authToken = 'auth-token';
			const body = {
				email: 'newmember@example.com',
				role: 'member',
			};

			// Mock the apiCall to simulate a failed response
			apiCall.mockResolvedValue({ success: false });

			const inviteMember = async () => {
				const result = await inviteNewMember(authToken, body);
				return result.success ? 'Member invited' : 'Failed to invite member';
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

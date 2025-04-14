import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditLogs } from '../../source/hooks/useAuditLogs.js';

// Mock client functions
const mockGetFn = vi.fn();
const mockPostFn = vi.fn();

// Mock the useClient hook
vi.mock('../../source/hooks/useClient.js', () => ({
	default: () => ({
		authenticatedApiClient: () => ({ GET: mockGetFn }),
		authenticatedPdpClient: () => ({ POST: mockPostFn }),
	}),
}));

// Mock React hooks
vi.mock('react', async () => {
	const React = await vi.importActual('react');
	return {
		...React,
		useCallback: fn => fn,
		useMemo: fn => fn(),
	};
});

describe('useAuditLogs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches audit logs with correct parameters', async () => {
		mockGetFn.mockResolvedValueOnce({
			data: {
				data: [
					{
						id: 'log1',
						timestamp: '2023-01-01',
						action: 'read',
						decision: true,
					},
					{
						id: 'log2',
						timestamp: '2023-01-02',
						action: 'write',
						decision: false,
					},
				],
			},
			error: null,
		});

		const { getAuditLogs } = useAuditLogs();
		const result = await getAuditLogs({
			timeFrame: 24,
			sourcePdp: 'test-pdp',
			users: ['user1', 'user2'],
			resources: ['resource1'],
			tenant: 'tenant1',
			action: 'read',
			decision: true,
		});

		expect(mockGetFn).toHaveBeenCalledTimes(1);
		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/pdps/{proj_id}/{env_id}/audit_logs',
			undefined,
			undefined,
			expect.objectContaining({
				timestamp_from: expect.any(Number),
				timestamp_to: expect.any(Number),
				pdp_id: 'test-pdp',
				users: ['user1', 'user2'],
				resources: ['resource1'],
				tenant: 'tenant1',
				action: 'read',
				decision: true,
				page: 1,
				per_page: 100,
				sort_by: 'timestamp',
			}),
		);
		expect(result).toEqual({
			data: {
				data: [
					{
						id: 'log1',
						timestamp: '2023-01-01',
						action: 'read',
						decision: true,
					},
					{
						id: 'log2',
						timestamp: '2023-01-02',
						action: 'write',
						decision: false,
					},
				],
			},
			error: null,
		});
	});

	it('handles API errors properly', async () => {
		mockGetFn.mockResolvedValueOnce({ data: null, error: 'Failed to fetch' });
		const { getAuditLogs } = useAuditLogs();
		const result = await getAuditLogs({ timeFrame: 24 });
		expect(result.data).toBeNull();
		expect(result.error).toBe('Failed to fetch');
	});

	it('fetches detailed audit log by ID', async () => {
		const mockLog = {
			id: 'log1',
			timestamp: '2023-01-01',
			action: 'read',
			decision: true,
		};
		mockGetFn.mockResolvedValueOnce({ data: mockLog, error: null });

		const { getAuditLogDetails } = useAuditLogs();
		const result = await getAuditLogDetails('log1');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/pdps/{proj_id}/{env_id}/audit_logs/{log_id}',
			{ log_id: 'log1' },
		);
		expect(result).toEqual({ data: mockLog, error: null });
	});

	it('handles audit log not found', async () => {
		mockGetFn.mockResolvedValueOnce({
			data: null,
			error: 'Audit log not found',
		});
		const { getAuditLogDetails } = useAuditLogs();
		const result = await getAuditLogDetails('log1');

		expect(mockGetFn).toHaveBeenCalledWith(
			'/v2/pdps/{proj_id}/{env_id}/audit_logs/{log_id}',
			{ log_id: 'log1' },
		);
		expect(result).toEqual({ data: null, error: 'Audit log not found' });
	});

	it('calls PDP with correct request structure', async () => {
		mockPostFn.mockResolvedValueOnce({ data: { allow: true }, error: null });

		const testRequest = {
			tenant: 'tenant1',
			action: 'read',
			user: { key: 'user1' },
			resource: { type: 'document', key: 'doc1' },
		};

		const { checkPdpPermission } = useAuditLogs();
		const result = await checkPdpPermission(
			testRequest,
			'http://pdp.example.com',
		);

		// Now asserting the full shape your hook builds:
		expect(mockPostFn).toHaveBeenCalledWith('/allowed', undefined, {
			tenant: 'tenant1',
			action: 'read',
			user: {
				key: 'user1',
				firstName: undefined,
				lastName: undefined,
				email: undefined,
				attributes: {},
			},
			resource: {
				type: 'document',
				key: 'doc1',
				tenant: 'tenant1',
				attributes: {},
				context: {},
			},
			context: {},
		});
		expect(result).toEqual({ data: { allow: true }, error: null });
	});

	it('handles PDP errors properly', async () => {
		mockPostFn.mockResolvedValueOnce({ data: null, error: 'PDP check failed' });

		const { checkPdpPermission } = useAuditLogs();
		const result = await checkPdpPermission(
			{
				tenant: 'tenant1',
				action: 'read',
				user: { key: 'user1' },
				resource: { type: 'document' },
			},
			'http://pdp.example.com',
		);

		expect(result).toEqual({
			data: null,
			error: 'PDP check failed: PDP check failed',
		});
	});

	it('handles PDP request exceptions', async () => {
		mockPostFn.mockRejectedValueOnce(new Error('Network error'));

		const { checkPdpPermission } = useAuditLogs();
		const result = await checkPdpPermission(
			{
				tenant: 'tenant1',
				action: 'read',
				user: { key: 'user1' },
				resource: { type: 'document' },
			},
			'http://pdp.example.com',
		);

		expect(result.data).toBeNull();
		expect(result.error).toBe('Network error');
	});

	it('paginates through all audit logs', async () => {
		const page1 = Array.from({ length: 100 }, (_, i) => ({
			id: `log${i}`,
			timestamp: '2023-01-01',
			action: 'read',
			decision: true,
		}));
		const page2 = Array.from({ length: 50 }, (_, i) => ({
			id: `log${i + 100}`,
			timestamp: '2023-01-02',
			action: 'write',
			decision: false,
		}));
		mockGetFn.mockResolvedValueOnce({ data: { data: page1 }, error: null });
		mockGetFn.mockResolvedValueOnce({ data: { data: page2 }, error: null });

		const { getAuditLogs } = useAuditLogs();
		const result = await getAuditLogs({ timeFrame: 24 });

		expect(mockGetFn).toHaveBeenCalledTimes(2);
		expect(result.data.data).toHaveLength(150);
		expect(result.data.data[0].id).toBe('log0');
		expect(result.data.data[149].id).toBe('log149');
	});
});

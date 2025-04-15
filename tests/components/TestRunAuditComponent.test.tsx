import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRunAuditComponent from '../../source/components/test/TestRunAuditComponent';
import * as useAuditLogsModule from '../../source/hooks/useAuditLogs';

vi.mock('../../source/hooks/useAuditLogs');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('TestRunAuditComponent', () => {
	const defaultOptions = {
		timeFrame: 24,
		pdpUrl: 'http://localhost:7000',
		sourcePdp: undefined,
		users: undefined,
		resources: undefined,
		tenant: undefined,
		action: undefined,
		decision: undefined,
	};

	const mockAuditLog = {
		id: 'log-1',
		user_key: 'user-1',
		resource: 'resource-1',
		resource_type: 'resource-type-1',
		tenant: 'tenant-1',
		action: 'read',
		decision: true,
		timestamp: '2023-01-01T00:00:00Z',
	};

	const mockDetailedLog = {
		id: 'log-1',
		user_id: 'user-1',
		user_key: 'user-1',
		resource: 'resource-1',
		resource_type: 'resource-type-1',
		tenant: 'tenant-1',
		action: 'read',
		decision: true,
		context: {
			user: { id: 'user-1', key: 'user-1', attributes: {} },
			resource: { id: 'resource-1', type: 'resource-type-1', attributes: {} },
			tenant: 'tenant-1',
			action: 'read',
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders loading view initially', () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: vi.fn().mockResolvedValue({
				data: { allow: true },
				error: null,
			}),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		expect(lastFrame()).toContain('Fetching');
	});

	it('handles API errors when fetching audit logs', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: null,
				error: 'Failed to fetch audit logs',
			}),
			getAuditLogDetails: vi.fn(),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(150);
		expect(lastFrame()).toContain('Error:');
		expect(lastFrame()).toContain('Failed to fetch audit logs');
	});

	it('handles unexpected API responses', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { unexpected: 'format' },
				error: null,
			}),
			getAuditLogDetails: vi.fn(),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(150);
		expect(lastFrame()).toContain('Error:');
		expect(lastFrame()).toContain('Invalid response format');
	});

	it('handles empty audit logs', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [] },
				error: null,
			}),
			getAuditLogDetails: vi.fn(),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(150);
		expect(lastFrame()).toContain('No audit logs found');
	});

	it('handles errors during detailed log fetching', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: null,
				error: 'Failed to fetch detailed log',
			}),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(300);
		expect(lastFrame()).toContain('No audit logs found');
	});

	it('handles PDP connection validation errors', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: vi
				.fn()
				.mockRejectedValue(new Error('PDP not accessible')),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(300);
		expect(lastFrame()).toContain('Error:');
		expect(lastFrame()).toContain('PDP');
		expect(lastFrame()).toContain('not accessible');
	});

	it('handles PDP check errors during comparison', async () => {
		const mockCheckPdpPermission = vi
			.fn()
			.mockResolvedValueOnce({ data: { allow: true }, error: null })
			.mockResolvedValueOnce({ data: null, error: 'PDP check failed' });

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog, mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: mockCheckPdpPermission,
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(400);
		expect(lastFrame()).toContain('Compared');
		expect(lastFrame()).toContain('differences');
	});

	it('successfully processes logs and displays results', async () => {
		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog, mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: vi.fn().mockResolvedValue({
				data: { allow: true },
				error: null,
			}),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(400);
		expect(lastFrame()).toContain('Compared');
		expect(lastFrame()).toContain('matches');
	});

	it('passes filter options to getAuditLogs', async () => {
		const getAuditLogsMock = vi.fn().mockResolvedValue({
			data: { data: [mockAuditLog] },
			error: null,
		});

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: getAuditLogsMock,
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: vi.fn().mockResolvedValue({
				data: { allow: true },
				error: null,
			}),
		});

		const customOptions = {
			timeFrame: 48,
			pdpUrl: 'http://custom-pdp:7000',
			sourcePdp: 'pdp-1',
			users: ['user-1', 'user-2'],
			resources: ['resource-1'],
			tenant: 'tenant-1',
			action: 'read',
			decision: 'allow',
		};

		render(<TestRunAuditComponent options={customOptions} />);
		await sleep(200);
		expect(getAuditLogsMock).toHaveBeenCalledWith({
			timeFrame: 48,
			sourcePdp: 'pdp-1',
			users: ['user-1', 'user-2'],
			resources: ['resource-1'],
			tenant: 'tenant-1',
			action: 'read',
			decision: true,
		});
	});

	it('handles different PDP response formats', async () => {
		// First case: PDP returns "allow"
		let mockCheckPdpPermission = vi
			.fn()
			.mockResolvedValue({ data: { allow: true }, error: null });

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: mockCheckPdpPermission,
		});

		const { unmount } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(400);
		unmount();

		vi.clearAllMocks();

		// Second case: PDP returns "allowed"
		mockCheckPdpPermission = vi
			.fn()
			.mockResolvedValue({ data: { allowed: true }, error: null });

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedLog,
				error: null,
			}),
			checkPdpPermission: mockCheckPdpPermission,
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(400);
		expect(lastFrame()).toContain('Compared');
	});
});

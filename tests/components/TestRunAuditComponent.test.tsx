import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TestRunAuditComponent from '../../source/components/test/TestRunAuditComponent';
import * as useClientModule from '../../source/hooks/useClient';
import * as useAuditLogsModule from '../../source/hooks/useAuditLogs';

vi.mock('../../source/hooks/useClient');
vi.mock('../../source/hooks/useAuditLogs');

const createMockApiFunction = returnValue =>
	vi.fn().mockReturnValue({
		GET: vi.fn().mockResolvedValue(returnValue),
	});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('TestRunAuditComponent', () => {
	const defaultOptions = {
		timeFrame: '24h',
		pdpUrl: 'http://localhost:7000',
		sourcePdp: undefined,
		users: undefined,
		resources: undefined,
		tenant: undefined,
		action: undefined,
		decision: undefined,
	};

	const mockScope = {
		project_id: 'project-1',
		environment_id: 'env-1',
		organization_id: 'org-1',
	};

	const mockAuditLog = {
		id: 'log-1',
		user: { key: 'user-1' },
		resource: { type: 'resource-type-1', key: 'resource-1' },
		tenant: 'tenant-1',
		action: 'read',
		decision: true,
		timestamp: '2023-01-01T00:00:00Z',
	};

	const mockDetailedLog = {
		id: 'log-1',
		context: {
			user: { key: 'user-1', attributes: {} },
			resource: { key: 'resource-1', type: 'resource-type-1', attributes: {} },
			tenant: 'tenant-1',
			action: 'read',
		},
		decision: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders loading view initially', () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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

	it('handles API errors when fetching scope', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: null,
				error: 'Failed to get scope',
			}),
		});

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn(),
			getAuditLogDetails: vi.fn(),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(100);
		expect(lastFrame()).toContain('Error:');
		expect(lastFrame()).toContain('Failed to get scope');
	});

	it('handles missing project or environment in scope', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: { organization_id: 'org-1' },
				error: null,
			}),
		});

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn(),
			getAuditLogDetails: vi.fn(),
			checkPdpPermission: vi.fn(),
		});

		const { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(100);
		expect(lastFrame()).toContain('Error:');
		expect(lastFrame()).toContain(
			'Could not determine current project and environment',
		);
	});

	it('handles API errors when fetching audit logs', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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

	it('handles empty audit logs', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

		const mockCheckPdpPermission = vi
			.fn()
			.mockRejectedValue(new Error('PDP not accessible'));

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
		await sleep(300);
		expect(lastFrame()).toContain('No audit logs found');
	});

	it('handles PDP check errors during comparison', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

		const mockCheckPdpPermission = vi
			.fn()
			.mockResolvedValueOnce({ data: { allow: true }, error: null })
			.mockResolvedValueOnce({ data: null, error: 'PDP check failed' });

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
		expect(lastFrame()).toContain('No audit logs found');
	});

	it('successfully processes logs and displays results', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

		const mockDetailedSuccessLog = { ...mockDetailedLog };

		vi.mocked(useAuditLogsModule.default).mockReturnValue({
			getAuditLogs: vi.fn().mockResolvedValue({
				data: { data: [mockAuditLog] },
				error: null,
			}),
			getAuditLogDetails: vi.fn().mockResolvedValue({
				data: mockDetailedSuccessLog,
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
		expect(lastFrame()).toContain('No audit logs found');
	});

	it('passes filter options to getAuditLogs', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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
			timeFrame: '48h',
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
			timeFrame: '48h',
			sourcePdp: 'pdp-1',
			users: ['user-1', 'user-2'],
			resources: ['resource-1'],
			tenant: 'tenant-1',
			action: 'read',
			decision: true,
		});
	});

	it('handles different PDP response formats', async () => {
		vi.mocked(useClientModule.default).mockReturnValue({
			authenticatedApiClient: createMockApiFunction({
				data: mockScope,
				error: null,
			}),
		});

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

		let { lastFrame } = render(
			<TestRunAuditComponent options={defaultOptions} />,
		);
		await sleep(400);
		expect(lastFrame()).toContain('No audit logs found');

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
	});
});

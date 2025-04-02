import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'ink';
import useClient from '../../hooks/useClient.js';
import useAuditLogs from '../../hooks/useAuditLogs.js';
import {
	ApiScope,
	AuditLog,
	CommandOptions,
	ComparisonResult,
	DetailedAuditLog,
	ProcessPhase,
	ProgressState,
} from './auditTypes.js';
import {
	collectResourceTypes,
	createPdpRequest,
	normalizeDetailedLog,
} from './utils/auditUtils.js';
import ErrorView from './views/ErrorView.js';
import LoadingView from './views/LoadingView.js';
import ResultsView from './views/ResultsView.js';

const TestRunAuditComponent: React.FC<{ options: CommandOptions }> = ({
	options,
}) => {
	// State
	const [loading, setLoading] = useState(true);
	const [phase, setPhase] = useState<ProcessPhase>('fetching');
	const [error, setError] = useState<string | null>(null);
	const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
	const [detailedLogs, setDetailedLogs] = useState<DetailedAuditLog[]>([]);
	const [results, setResults] = useState<ComparisonResult[]>([]);
	const [progress, setProgress] = useState<ProgressState>({
		current: 0,
		total: 0,
	});
	const [scope, setScope] = useState<ApiScope | null>(null);
	const [resourceTypes, setResourceTypes] = useState<Set<string>>(new Set());

	// Hooks
	const { authenticatedApiClient } = useClient();
	const { getAuditLogs, getAuditLogDetails, checkPdpPermission } =
		useAuditLogs();

	// ========================
	// API & Data Fetching
	// ========================

	/**
	 * Fetches the current scope (project, environment) from the API
	 */
	const fetchScope = useCallback(async () => {
		try {
			const { data, error } =
				await authenticatedApiClient().GET('/v2/api-key/scope');

			if (error || !data) {
				throw new Error(
					`Failed to get current scope: ${error || 'No scope returned'}`,
				);
			}

			if (!data.project_id || !data.environment_id) {
				throw new Error(
					"Could not determine current project and environment. Please ensure you're logged in.",
				);
			}

			setScope({
				project_id: data.project_id,
				environment_id: data.environment_id,
				organization_id: data.organization_id,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setLoading(false);
		}
	}, [authenticatedApiClient]);

	/**
	 * Fetches audit logs based on filter options
	 */
	const fetchAuditLogs = useCallback(async () => {
		if (!scope) return;

		try {
			setPhase('fetching');

			// Parse and prepare filter options
			const filterOptions = {
				timeFrame: options.timeFrame,
				sourcePdp: options.sourcePdp,
				users: options.users,
				resources: options.resources,
				tenant: options.tenant,
				action: options.action,
				decision:
					options.decision === 'allow'
						? true
						: options.decision === 'deny'
							? false
							: undefined,
			};

			const { data, error } = await getAuditLogs(filterOptions);

			if (error) {
				throw new Error(`Failed to fetch audit logs: ${error}`);
			}

			if (!data || !Array.isArray(data.data)) {
				console.log(
					'Received data structure:',
					JSON.stringify(data, null, 2).substring(0, 500) + '...',
				);
				throw new Error('Invalid response format for audit logs');
			}

			const auditLogsData = data.data as AuditLog[];

			// Collect all resource types for later use
			const types = collectResourceTypes(auditLogsData);
			setResourceTypes(types);

			setAuditLogs(auditLogsData);
			setProgress({ current: 0, total: auditLogsData.length });

			if (auditLogsData.length === 0) {
				setLoading(false);
				setPhase('complete');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setLoading(false);
		}
	}, [options, scope, getAuditLogs]);

	/**
	 * Fetches detailed information for each audit log
	 */
	const fetchDetailedLogs = useCallback(async () => {
		if (!auditLogs.length) return;

		try {
			setPhase('processing');
			const detailed: DetailedAuditLog[] = [];

			for (let i = 0; i < auditLogs.length; i++) {
				const log = auditLogs[i];
				if (!log) continue;

				setProgress({ current: i + 1, total: auditLogs.length });

				// Fetch detailed log
				const { data, error } = await getAuditLogDetails(log.id);

				if (error || !data) {
					continue;
				}

				// Process and normalize the log data
				const detailedLog = normalizeDetailedLog(data, log, resourceTypes);
				if (detailedLog) {
					detailed.push(detailedLog);
				}
			}

			setDetailedLogs(detailed);
			setProgress({ current: 0, total: detailed.length });

			if (detailed.length === 0) {
				setLoading(false);
				setPhase('complete');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setLoading(false);
		}
	}, [auditLogs, getAuditLogDetails, resourceTypes]);

	/**
	 * Validates that the PDP is accessible
	 */
	const validatePdpConnection = useCallback(
		async (
			log: DetailedAuditLog,
			resourceTypes: Set<string>,
		): Promise<void> => {
			try {
				const request = createPdpRequest(log, resourceTypes);
				await checkPdpPermission(request, options.pdpUrl);
			} catch (err) {
				throw new Error(
					`PDP at ${options.pdpUrl} is not accessible: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		},
		[options.pdpUrl, checkPdpPermission],
	);

	/**
	 * Runs all checks against the target PDP
	 */
	const runCheckFunctions = useCallback(async () => {
		if (!detailedLogs.length) return;

		try {
			setPhase('checking');
			const comparisonResults: ComparisonResult[] = [];

			// Ensure PDP is accessible with a test call
			if (detailedLogs.length > 0 && detailedLogs[0]) {
				await validatePdpConnection(detailedLogs[0], resourceTypes);
			} else {
				throw new Error(
					'No detailed logs available to validate PDP connection',
				);
			}

			// Process each log
			for (let i = 0; i < detailedLogs.length; i++) {
				const log = detailedLogs[i];
				if (!log) continue;

				setProgress({ current: i + 1, total: detailedLogs.length });

				try {
					const request = createPdpRequest(log, resourceTypes);
					const { data, error } = await checkPdpPermission(
						request,
						options.pdpUrl,
					);

					if (error) {
						throw new Error(`PDP check failed: ${error}`);
					}

					// Data might have different structures depending on PDP version
					// Use type assertion to handle potential API differences
					const responseData = data as unknown as {
						allow?: boolean;
						allowed?: boolean;
						result?: boolean;
					};

					const allowed =
						responseData?.allow ||
						responseData?.allowed ||
						responseData?.result;

					comparisonResults.push({
						auditLog: log,
						originalDecision: Boolean(log.decision),
						newDecision: Boolean(allowed),
						matches: Boolean(log.decision) === Boolean(allowed),
					});
				} catch (err) {
					comparisonResults.push({
						auditLog: log,
						originalDecision: Boolean(log.decision),
						newDecision: false,
						matches: false,
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			setResults(comparisonResults);
			setLoading(false);
			setPhase('complete');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setLoading(false);
		}
	}, [
		detailedLogs,
		validatePdpConnection,
		checkPdpPermission,
		options.pdpUrl,
		resourceTypes,
	]);

	// ========================
	// Process Orchestration
	// ========================

	// Initialize by fetching scope
	useEffect(() => {
		fetchScope();
	}, [fetchScope]);

	// Fetch audit logs once we have the scope
	useEffect(() => {
		if (scope) {
			fetchAuditLogs();
		}
	}, [scope, fetchAuditLogs]);

	// Fetch detailed logs once we have audit logs
	useEffect(() => {
		if (auditLogs.length > 0) {
			fetchDetailedLogs();
		}
	}, [auditLogs, fetchDetailedLogs]);

	// Run checks once we have detailed logs
	useEffect(() => {
		if (detailedLogs.length > 0) {
			runCheckFunctions();
		}
	}, [detailedLogs, runCheckFunctions]);

	// ========================
	// UI Rendering
	// ========================

	if (error) {
		return <ErrorView error={error} pdpUrl={options.pdpUrl} />;
	}

	if (loading) {
		return <LoadingView phase={phase} progress={progress} />;
	}

	if (results.length === 0) {
		return (
			<Text>
				No audit logs found matching the criteria or all logs failed to process.
			</Text>
		);
	}

	return <ResultsView results={results} pdpUrl={options.pdpUrl} />;
};

export default TestRunAuditComponent;

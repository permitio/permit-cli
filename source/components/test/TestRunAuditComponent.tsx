import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import useClient from '../../hooks/useClient.js';
import useAuditLogs, {
	AuditLog,
	DetailedAuditLog,
} from '../../hooks/useAuditLogs.js';

// ========================
// Type Definitions
// ========================

interface ApiScope {
	project_id: string;
	environment_id: string;
	organization_id: string;
}

interface ComparisonResult {
	auditLog: DetailedAuditLog;
	originalDecision: boolean;
	newDecision: boolean;
	matches: boolean;
	error?: string;
}

interface ProgressState {
	current: number;
	total: number;
}

interface CommandOptions {
	pdpUrl: string;
	timeFrame: number;
	sourcePdp?: string;
	users?: string;
	resources?: string;
	tenant?: string;
	action?: string;
	decision?: 'allow' | 'deny';
}

type ProcessPhase = 'fetching' | 'processing' | 'checking' | 'complete';

// ========================
// Helper Functions
// ========================

/**
 * Collects all resource types from audit logs
 */
const collectResourceTypes = (logs: AuditLog[]): Set<string> => {
	const types = new Set<string>();
	logs.forEach(log => {
		if (log.resource_type) {
			types.add(log.resource_type);
		}
	});
	return types;
};

/**
 * Gets a default resource type when none is provided
 */
const getDefaultResourceType = (types: Set<string>): string => {
	for (const type of types) {
		return type; // Return the first type found
	}
	return 'resource'; // Return default if Set is empty
};

/**
 * Normalizes and enriches a detailed log with consistent fields
 */
const normalizeDetailedLog = (
	response: Record<string, any>,
	originalLog: AuditLog,
	resourceTypes: Set<string>,
): DetailedAuditLog | null => {
	try {
		// Get a suitable resource type
		const resourceType =
			response['resource_type'] ||
			originalLog.resource_type ||
			getDefaultResourceType(resourceTypes);

		// Get user identifier
		const userId =
			response['user_key'] ||
			response['user_email'] ||
			originalLog.user_key ||
			'';

		if (!userId) {
			return null; // Skip logs without a user ID
		}

		// Create a normalized detailed log
		const detailedLog: DetailedAuditLog = {
			...(response as AuditLog),
			id: response['id'] || originalLog.id,
			timestamp: response['timestamp'] || originalLog.timestamp,
			user_id: userId,
			user_key: response['user_key'] || originalLog.user_key,
			resource: response['resource'] || originalLog.resource || '',
			resource_type: resourceType,
			tenant: response['tenant'] || originalLog.tenant || 'default',
			action: response['action'] || originalLog.action || '',
			decision: response['decision'] === true,

			// Build or normalize context object
			context: response['context'] || {
				user: {
					id: userId,
					key: userId,
				},
				resource: {
					type: resourceType,
					id: response['resource'] || originalLog.resource || '',
				},
				tenant: response['tenant'] || originalLog.tenant || 'default',
				action: response['action'] || originalLog.action || '',
			},
		};

		return detailedLog;
	} catch (_error) {
		
		return null;
	}
};

/**
 * Creates a properly formatted PDP request
 */
const createPdpRequest = (
	log: DetailedAuditLog,
	resourceTypes: Set<string>,
): Record<string, unknown> => {
	return {
		tenant: log.tenant || 'default',
		action: log.action,
		user: {
			key: log.user_key || log.user_id,
		},
		resource: {
			type: log.resource_type || getDefaultResourceType(resourceTypes),
			...(log.resource ? { key: log.resource } : {}),
		},
	};
};

// ========================
// UI Components
// ========================

interface ErrorViewProps {
	error: string;
	pdpUrl: string;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error, pdpUrl }) => (
	<Box flexDirection="column">
		<Text color="red">Error: {error}</Text>
		<Box marginTop={1}>
			<Text>Troubleshooting tips:</Text>
		</Box>
		<Box paddingLeft={2} flexDirection="column" marginTop={1}>
			<Text>
				1. Ensure you're logged in with valid credentials (run 'permit login')
			</Text>
			<Text>2. Check if you have permission to access audit logs</Text>
			<Text>3. Verify your PDP URL is correct: {pdpUrl}</Text>
			<Text>4. Try with a smaller time frame: --timeFrame 6</Text>
		</Box>
	</Box>
);

interface LoadingViewProps {
	phase: ProcessPhase;
	progress: ProgressState;
}

const LoadingView: React.FC<LoadingViewProps> = ({ phase, progress }) => (
	<Box flexDirection="column">
		<Box>
			<Text>
				<Text color="green">
					<Spinner type="dots" />
				</Text>{' '}
				{phase === 'fetching' && 'Fetching audit logs...'}
				{phase === 'processing' &&
					`Processing audit logs (${progress.current}/${progress.total})...`}
				{phase === 'checking' &&
					`Checking against PDP (${progress.current}/${progress.total})...`}
			</Text>
		</Box>
	</Box>
);

// Result view components
interface ResultViewProps {
	result: ComparisonResult;
}

const ErrorResultView: React.FC<ResultViewProps> = ({ result }) => (
	<>
		<Text>User: {result.auditLog.user_id}</Text>
		<Text>
			Resource: {result.auditLog.resource} (type:{' '}
			{result.auditLog.resource_type})
		</Text>
		<Text>Action: {result.auditLog.action}</Text>
		<Text>Tenant: {result.auditLog.tenant}</Text>
		<Text color="yellow">Error: {result.error}</Text>
	</>
);

const DifferenceResultView: React.FC<ResultViewProps> = ({ result }) => (
	<>
		<Text>User: {result.auditLog.user_id}</Text>
		<Text>
			Resource: {result.auditLog.resource} (type:{' '}
			{result.auditLog.resource_type})
		</Text>
		<Text>Action: {result.auditLog.action}</Text>
		<Text>Tenant: {result.auditLog.tenant}</Text>
		<Text>
			Original:{' '}
			<Text color={result.originalDecision ? 'green' : 'red'}>
				{result.originalDecision ? 'ALLOW' : 'DENY'}
			</Text>
			, New:{' '}
			<Text color={result.newDecision ? 'green' : 'red'}>
				{result.newDecision ? 'ALLOW' : 'DENY'}
			</Text>
		</Text>
	</>
);

interface DifferencesViewProps {
	results: ComparisonResult[];
}

const DifferencesView: React.FC<DifferencesViewProps> = ({ results }) => (
	<Box flexDirection="column" marginBottom={1}>
		<Text bold underline>
			Differences found:
		</Text>
		{results.map((result, i) => (
			<Box key={i} flexDirection="column" marginTop={1} paddingLeft={2}>
				{result.error ? (
					<ErrorResultView result={result} />
				) : (
					<DifferenceResultView result={result} />
				)}
			</Box>
		))}
	</Box>
);

interface ResultsViewProps {
	results: ComparisonResult[];
	pdpUrl: string;
}

const ResultsView: React.FC<ResultsViewProps> = ({ results, pdpUrl }) => {
	// Count matches and mismatches
	const matches = results.filter(r => r.matches).length;
	const mismatches = results.length - matches;
	const errors = results.filter(r => r.error).length;

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text>
					Compared {results.length} audit logs against PDP at {pdpUrl}
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text>
					Results: <Text color="green">{matches} matches</Text>,{' '}
					<Text color={mismatches > 0 ? 'red' : 'green'}>
						{mismatches} differences
					</Text>
					{errors > 0 && <Text color="yellow">, {errors} errors</Text>}
				</Text>
			</Box>

			{mismatches > 0 && (
				<DifferencesView results={results.filter(r => !r.matches)} />
			)}

			{mismatches === 0 && (
				<Text color="green">
					✓ All decisions match! The PDP behaves identically to the audit log
					data.
				</Text>
			)}
		</Box>
	);
};

// ========================
// Component Implementation
// ========================

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

			// Parse and prepare filter options - match the original code
			const filterOptions = {
				timeFrame: options.timeFrame,
				sourcePdp: options.sourcePdp,
				users: options.users ? options.users.split(',') : undefined,
				resources: options.resources ? options.resources.split(',') : undefined,
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
				await checkPdpPermission(request as any, options.pdpUrl);
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
						request as any,
						options.pdpUrl,
					);

					if (error) {
						throw new Error(`PDP check failed: ${error}`);
					}

					// Data might have different structures depending on PDP version
					const responseData = data as Record<string, any>;
					const allowed =
						responseData?.['allow'] ||
						responseData?.['allowed'] ||
						responseData?.['result'];

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

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../AuthProvider.js';
import { PDPStatsProps } from '../../commands/pdp/stats.js';
import { PERMIT_API_STATISTICS_URL } from '../../config.js';
import TableComponent from '../ui/Table.js';
import { fetchUtil, MethodE } from '../../utils/fetchUtil.js';

const isObjectEmpty = (object: object | undefined) => {
	if (!object) return undefined;
	return Object.keys(object).length === 0;
};

export default function PDPStatComponent({ options }: PDPStatsProps) {
	// State to store API errors
	const [error, setError] = useState<string | undefined>('');

	// Get authentication details from the AuthProvider
	const auth = useAuth();

	// State To Store Statistics URL
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [statisticsURL, _] = useState<string>(
		`${options.statsUrl || PERMIT_API_STATISTICS_URL}/${auth.scope.project_id || options.projectKey}/${auth.scope.environment_id || options.environmentKey}/pdps`,
	);

	// State to store API response data
	const [res, setRes] = useState<{ data: object[] | undefined }>({
		data: undefined,
	});

	// ✅ Wrap queryPDP in useCallback to prevent unnecessary re-creations
	const queryPDP = useCallback(async () => {
		try {
			const response = await fetchUtil(
				statisticsURL,
				MethodE.GET,
				auth.authToken,
			);
			if (response.success) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				setRes((response as any).data);
			} else {
				console.error('Error fetching PDP stats:', response.error);
				setError(response.error);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [auth.authToken, statisticsURL]); // 🔥 Dependencies: Only re-create if `apiKey` changes

	useEffect(() => {
		// eslint-disable-next-line no-undef
		let intervalId: NodeJS.Timeout;
		queryPDP(); // Immediate call
		if (options.top) {
			intervalId = setInterval(queryPDP, 3000); // Call every 3 seconds

			return () => clearInterval(intervalId); // Cleanup on unmount
		}
		return;
	}, [queryPDP, options]); // 🔥 Now depends on queryPDP

	return (
		<>
			{/* If there is data, render the table component */}
			{res?.data && !isObjectEmpty(res?.data) && res?.data?.length > 0 && (
				<TableComponent
					data={res?.data || []}
					headers={['id', 'active', 'pdp_version', 'opa_version']} // Define which columns to display
				/>
			)}

			{/* If there is no data and no error, show a loading spinner */}
			{res?.data === undefined && error === '' && <Spinner type="dots" />}

			{/* If there is an error, display the error message */}
			{error && (
				<Box>
					<Text color="red">Request failed: {error}</Text>
					<Newline />
					<Text>{JSON.stringify(res)}</Text>{' '}
					{/* Show raw API response for debugging */}
				</Box>
			)}
			{/* If the result is empty array , print message there is no pdps for that environment */}
			{res?.data?.length === 0 && (
				<Box>
					<Text color="blue">PDP Was Not Configure For Environment</Text>
					<Newline />
					{/* Show raw API response for debugging */}
				</Box>
			)}
		</>
	);
}

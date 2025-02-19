import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../AuthProvider.js';
import { PDPStatsProps } from '../../commands/pdp/stats.js';
import { PERMIT_API_STATISTICS_URL } from '../../config.js';
import TableComponent from '../ui/Table.js';
import { fetchUtil, MethodE } from '../../utils/fetchUtil.js';

const isObjectEmpty = (object: object) => {
	return Object.keys(object).length === 0;
};

export default function PDPStatComponent({ options }: PDPStatsProps) {
	// State to store API errors
	const [error, setError] = useState('');

	// State to store API response data
	const [res, setRes] = useState<{ data: object[] }>({ data: [] });

	// Get authentication details from the AuthProvider
	const auth = useAuth();

	useEffect(() => {
		// Function to fetch PDP statistics data
		const queryPDP = async (apiKey: string) => {
			try {
				// Construct the API URL dynamically using project/environment keys
				const response = await fetchUtil(
					`${options.statsUrl || PERMIT_API_STATISTICS_URL}/${auth.scope.project_id || options.projectKey}/${auth.scope.environment_id || options.environmentKey}/pdps`,
					MethodE.GET,
					apiKey,
				);

				// If the request was successful, update state with the response data
				if (response.success) {
					setRes(response.data as any); // Casting response.data as 'any' (consider adding stronger typing)
				} else {
					// Log and store the error message if the request failed
					console.error('Error fetching PDP stats:', response.error);
					setError(response.error);
				}
			} catch (err) {
				// Handle unexpected errors
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError(String(err));
				}
			}
		};

		// If authentication has failed, store the error message
		if (auth.error) {
			setError(auth.error);
		}

		// Only fetch data if authentication is complete and not in a loading state
		if (!auth.loading) {
			queryPDP(auth.authToken);
		}
	}, [auth, options]); // Dependency array ensures this runs when auth or options change

	return (
		<>
			{/* If there is data, render the table component */}
			{!isObjectEmpty(res.data) && (
				<TableComponent
					data={res.data}
					headers={['id', 'active', 'pdp_version', 'opa_version']} // Define which columns to display
					headersHexColor={'#89CFF0'} // Light blue header color
				/>
			)}

			{/* If there is no data and no error, show a loading spinner */}
			{isObjectEmpty(res.data) && error === '' && <Spinner type="dots" />}

			{/* If there is an error, display the error message */}
			{error && (
				<Box>
					<Text color="red">Request failed: {error}</Text>
					<Newline />
					<Text>{JSON.stringify(res)}</Text> {/* Show raw API response for debugging */}
				</Box>
			)}
		</>
	);
}

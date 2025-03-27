import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../components/AuthProvider.js';
import { useGraphDataApi } from '../hooks/useGraphDataApi.js';
import { saveHTMLGraph } from './HtmlGraphSaver.js';

export default function Graph() {
	const { scope, loading: authLoading, error: authError } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [noData, setNoData] = useState(false);
	const { fetchGraphData } = useGraphDataApi();

	useEffect(() => {
		if (!scope.project_id || !scope.environment_id) {
			setError(
				'Required project or environment not found in auth context. Please ensure you are logged in with the proper scope.',
			);
		}
	}, [scope.project_id, scope.environment_id]);

	useEffect(() => {
		const fetchData = async () => {
			if (!scope.project_id || !scope.environment_id) return;
			try {
				setLoading(true);
				const { data: graphData, error: fetchError } = await fetchGraphData(
					scope.project_id,
					scope.environment_id,
				);
				if (fetchError) {
					setError('Failed to fetch data. Check network or auth token.');
					setLoading(false);
					return;
				}
				if (!graphData || graphData.nodes.length === 0) {
					setNoData(true);
					setLoading(false);
					return;
				}
				saveHTMLGraph(graphData);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching graph data:', err);
				setError('Failed to fetch data. Check network or auth token.');
				setLoading(false);
			}
		};

		fetchData();
	}, [scope.project_id, scope.environment_id, fetchGraphData]);

	// Render loading, error, or no data states.
	if (authLoading || loading) {
		return (
			<Text>
				<Spinner type="dots" />{' '}
				{authLoading ? 'Authenticating...' : 'Loading Permit Graph...'}
			</Text>
		);
	}

	if (authError || error) {
		return <Text color="red">{authError || error}</Text>;
	}

	if (noData) {
		return <Text>Environment does not contain any data</Text>;
	}

	return <Text>Graph generated successfully and saved as HTML!</Text>;
}

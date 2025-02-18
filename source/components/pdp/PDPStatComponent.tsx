import React, { useEffect, useState } from 'react';
import { Box, Newline, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../AuthProvider.js';
import { PDPStatsProps } from '../../commands/pdp/stats.js';
import { PERMIT_API_STATISTICS_URL } from '../../config.js';
import TableComponent from '../ui/Table.js';

const isObjectEmpty = (object: object) => {
	return Object.keys(object).length === 0;
};

export default function PDPStatComponent({ options }: PDPStatsProps) {
	const [error, setError] = useState('');
	const [res, setRes] = useState<{ data: object[] }>({ data: [] });

	const auth = useAuth();

	useEffect(() => {
		const queryPDP = async (apiKey: string) => {
			try {
				const response = await fetch(
					`${options.statsUrl || PERMIT_API_STATISTICS_URL}/${auth.scope.project_id || options.projectKey}/${auth.scope.environment_id || options.environmentKey}/pdps`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
						},
					},
				);

				if (!response.ok) {
					const errorText = await response.text();
					setError(errorText);
					return;
				}

				const res = await response.json();
				setRes(res);
			} catch (err) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError(String(err));
				}
			}
		};

		if (auth.error) {
			setError(auth.error);
		}
		if (!auth.loading) {
			queryPDP(auth.authToken);
		}
	}, [auth, options]);

	return (
		<>
			{!isObjectEmpty(res.data) && (
				<TableComponent
					data={res.data}
					headers={['id','active', 'pdp_version', 'opa_version']}
					headersHexColor={'#89CFF0'}
				/>
			)}
			{isObjectEmpty(res.data) && error === '' && <Spinner type="dots" />}
			{error && (
				<Box>
					<Text color="red">Request failed: {error}</Text>
					<Newline />
					<Text>{JSON.stringify(res)}</Text>
				</Box>
			)}
		</>
	);
}

// File: components/api/proxy/APIListProxyTableComponent.tsx
import React, { useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TableComponent from '../../ui/Table.js';
import { useAuth } from '../../AuthProvider.js';
import { useListProxy } from '../../../hooks/useListProxy.js';
import { type infer as zInfer } from 'zod';
import { options } from '../../../commands/api/list/proxy.js';

type Props = {
	options: zInfer<typeof options>;
};

// Maximum key length for display purposes.
const MAX_KEY_LENGTH = 7;

// Helper function to truncate keys for display.
const truncateKey = (key: string, expand: boolean) => {
	console.log('key', key, expand);
	if (expand) return key;
	return key.length > MAX_KEY_LENGTH ? key.slice(0, MAX_KEY_LENGTH) + '...' : key;
};

// Define a type for table row data.
interface TableProxyData {
	'#': number;
	key: string;
	secret: string;
	name: string;
	auth_mechanism: string;
	mapping_rules: string; // Concatenated list of mapping rule URLs (if any)
}

export default function APIListProxyTableComponent({ options }: Props) {
	const { scope } = useAuth();

	// Retrieve proxy data using your hook.
	const {
		status,
		errorMessage,
		proxies,
		totalCount,
		listProxies,
	} = useListProxy(
		scope.project_id || options.projectId,
		scope.environment_id || options.envId,
		options.apiKey,
		options.page,
		options.perPage,
	);

	// Fetch proxies when key parameters change.
	useEffect(() => {
		listProxies();
	}, [
		options.page,
		options.perPage,
		scope.project_id,
		scope.environment_id,
		options.apiKey,
	]);

	// Transform the proxy data into table-friendly rows.
	const tableData: TableProxyData[] = useMemo(() => {
		return proxies.map((proxy, index) => {
			const mappingRulesFormatted =
				Array.isArray(proxy.mapping_rules) && proxy.mapping_rules.length > 0
					? proxy.mapping_rules
							.map(rule => (rule.url ? rule.url : ''))
							.filter(Boolean)
							.join(', ')
					: '';

			return {
				'#': (options.page - 1) * options.perPage + index + 1,
				key: truncateKey(proxy.key, options.expandKey),
				secret: proxy.secret,
				name: proxy.name,
				auth_mechanism: proxy.auth_mechanism,
				mapping_rules: mappingRulesFormatted,
			};
		});
	}, [proxies, options.page, options.perPage, options.expandKey]);

	// Render loading state.
	if (status === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading proxy configs...
				</Text>
			</Box>
		);
	}

	// Render error state.
	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {errorMessage}</Text>;
	}

	// When data is ready, render the summary and table.
	if (status === 'done') {
		return (
			<Box flexDirection="column">
				<Text color="green">Proxy Configs:</Text>
				<Text>
					Showing {tableData.length} items | Page {options.page} | Total Pages: {totalCount}
				</Text>
				{tableData.length === 0 ? (
					<Text>No proxy configs found.</Text>
				) : (
					<TableComponent
						data={tableData}
						headers={[
							'#',
							'key',
							'secret',
							'name',
							'auth_mechanism',
							'mapping_rules',
						]}
						headersHexColor={'#89CFF0'}
					/>
				)}
			</Box>
		);
	}

	return null;
}

import React, { useEffect, useMemo } from 'react';
import { Box, Text, Static } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from '../../AuthProvider.js';
import { useListProxy } from '../../../hooks/useListProxy.js';
import { type infer as zInfer } from 'zod';
import { options as apiOptions } from '../../../commands/api/list/proxy.js';
import TableComponent from '../../ui/Table.js';

type Props = { options: zInfer<typeof apiOptions> };

export default function APIListProxyTableComponent({ options }: Props) {
	const { scope } = useAuth();
	const { status, errorMessage, proxies, totalCount, listProxies } =
		useListProxy(
			scope.project_id || options.projectId,
			scope.environment_id || options.envId,
			options.apiKey,
			options.page,
			options.perPage,
		);

	// Fetch proxies on mount & dependency changes
	useEffect(() => {
		listProxies();
	}, [
		listProxies,
		options.page,
		options.perPage,
		scope.project_id,
		scope.environment_id,
		options.apiKey,
	]);

	// Prepare table data
	const tableData = useMemo(
		() =>
			proxies.map((proxy, i) => ({
				'#': (options.page - 1) * options.perPage + i + 1,
				key: options.expandKey ? proxy.key : proxy.key.slice(0, 7) + '...',
				secret: proxy.secret,
				name: proxy.name,
				auth_mechanism: proxy.auth_mechanism,
				mapping_rules:
					Array.isArray(proxy.mapping_rules) && proxy.mapping_rules.length
						? proxy.mapping_rules
								.map(r => r.url || '')
								.filter(Boolean)
								.join(', ')
						: '',
			})),
		[proxies, options.page, options.perPage, options.expandKey],
	);

	// Column headers
	const headers = [
		'#',
		'key',
		'secret',
		'name',
		'auth_mechanism',
		'mapping_rules',
	];

	// Loading state
	if (status === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading proxy configs...
				</Text>
			</Box>
		);
	}

	// Error state
	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {errorMessage}</Text>;
	}

	// Done: render table once
	if (status === 'done') {
		return (
			<Static items={[{ key: 'proxy-configs' }]}>
				{() => (
					<Box key="proxy-configs" flexDirection="column">
						<Text color="green">Proxy Configs:</Text>
						<Text>
							Showing {tableData.length} items | Page {options.page} | Total
							Pages: {totalCount}
						</Text>
						{tableData.length === 0 ? (
							<Text>No proxy configs found.</Text>
						) : (
							<TableComponent
								data={tableData}
								headers={headers}
								headersHexColor="#89CFF0"
							/>
						)}
					</Box>
				)}
			</Static>
		);
	}

	return null;
}

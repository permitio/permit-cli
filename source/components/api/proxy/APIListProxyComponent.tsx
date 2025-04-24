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
		useListProxy(options.page, options.perPage);

	// Fetch proxies on mount & dependency changes
	useEffect(() => {
		listProxies(options.all);
	}, [
		listProxies,
		options.page,
		options.perPage,
		options.all,
		scope.project_id,
		scope.environment_id,
	]);

	// Prepare table data
	const tableData = useMemo(() => {
		return proxies.map((proxy, i) => {
			const urlsOnly =
				Array.isArray(proxy.mapping_rules) && proxy.mapping_rules.length
					? proxy.mapping_rules.map(r => r.url).join(', ')
					: '';

			// full pretty‐printed rule details
			const fullDetails =
				Array.isArray(proxy.mapping_rules) && proxy.mapping_rules.length
					? proxy.mapping_rules
							.map(r => {
								const parts: string[] = [];
								parts.push(`${r.url}`);
								parts.push(`(${r.http_method.toUpperCase()})`);
								if (r.resource) parts.push(`→ ${r.resource}`);
								if (r.action) parts.push(`[action: ${r.action}]`);
								if (r.priority != null) parts.push(`(prio: ${r.priority})`);

								// NEW: url_type
								if (r.url_type) parts.push(`[type: ${r.url_type}]`);

								// NEW: headers
								const hdrs = Object.entries(r.headers || {})
									.map(([k, v]) => `${k}=${v}`)
									.join(', ');
								if (hdrs) parts.push(`[headers: ${hdrs}]`);

								return parts.join(' ');
							})
							.join(', ')
					: '';

			return {
				'#': (options.page - 1) * options.perPage + i + 1,
				key: options.expandKey ? proxy.key : proxy.key.slice(0, 7) + '...',
				secret: proxy.secret,
				name: proxy.name,
				auth_mechanism: proxy.auth_mechanism,
				mapping_rules: options.expandKey ? fullDetails : urlsOnly,
			};
		});
	}, [proxies, options.page, options.perPage, options.expandKey]);

	const headers = [
		'#',
		'key',
		'secret',
		'name',
		'auth_mechanism',
		'mapping_rules',
	];

	if (status === 'processing') {
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading proxy configs...
				</Text>
			</Box>
		);
	}

	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {errorMessage}</Text>;
	}

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

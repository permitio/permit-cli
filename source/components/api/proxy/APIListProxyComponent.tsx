// File: components/api/proxy/APIListProxyTableComponent.tsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TableComponent from '../../ui/Table.js';
import { useAuth } from '../../AuthProvider.js';
import { useListProxy } from '../../../hooks/useListProxy.js';
import { type infer as zInfer } from 'zod';
import { options } from '../../../commands/api/list/proxy.js';

type Props = { options: zInfer<typeof options> };

const MAX_KEY_LENGTH = 7;
const truncateKey = (key: string, expand: boolean) =>
	expand
		? key
		: key.length > MAX_KEY_LENGTH
			? key.slice(0, MAX_KEY_LENGTH) + '...'
			: key;

interface TableProxyData {
	'#': number;
	key: string;
	secret: string;
	name: string;
	auth_mechanism: string;
	mapping_rules: string;
}

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

	// Call listProxies synchronously once on initial render
	const hasCalledRef = useRef(false);
	if (!hasCalledRef.current) {
		hasCalledRef.current = true;
		listProxies();
	}

	// Also refetch when key parameters change
	useEffect(() => {
		if (hasCalledRef.current) {
			listProxies();
		}
	}, [
		listProxies,
		options.page,
		options.perPage,
		scope.project_id,
		scope.environment_id,
		options.apiKey,
	]);

	const tableData: TableProxyData[] = useMemo(
		() =>
			proxies.map((proxy, i) => ({
				'#': (options.page - 1) * options.perPage + i + 1,
				key: truncateKey(proxy.key, options.expandKey),
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

	if (status === 'processing')
		return (
			<Box>
				<Text>
					<Spinner type="dots" /> Loading proxy configs...
				</Text>
			</Box>
		);
	if (status === 'error' && errorMessage)
		return <Text color="red">Error: {errorMessage}</Text>;

	if (status === 'done') {
		return (
			<Box flexDirection="column">
				<Text color="green">Proxy Configs:</Text>
				<Text>
					Showing {tableData.length} items | Page {options.page} | Total Pages:{' '}
					{totalCount}
				</Text>
				{tableData.length === 0 ? (
					<Text>No proxy configs found.</Text>
				) : (
					<Box width={1000}>
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
					</Box>
				)}
			</Box>
		);
	}

	return null;
}

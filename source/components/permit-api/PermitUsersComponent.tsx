import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { type infer as zInfer } from 'zod';
import { options } from '../../commands/permit-api/users.js';
import { useAuth } from '../../components/AuthProvider.js';
import TableComponent from '../ui/Table.js';
import Spinner from 'ink-spinner';

type Props = {
	options: zInfer<typeof options>;
};

type FetchOptions = {
	perPage: number;
	role?: string;
};

const isObjectEmpty = (object: object) => {
	return Object.keys(object).length === 0;
};

const formatRoles = (roles: Array<{ role: string; tenant: string }>) => {
	if (!roles.length) return '';
	return roles.map(role => role.role).join('\n');
};

const getTenant = (roles: Array<{ role: string; tenant: string }>) => {
	if (!roles.length) return '';
	const tenant = roles[0]?.tenant || '';
	return tenant
		? tenant.length > 7
			? tenant.slice(0, 7) + '...'
			: tenant
		: '';
};

const truncateKey = (key: string, expand = false) => {
	if (expand) return key;
	return key.length > 7 ? key.slice(0, 7) + '...' : key;
};

const fetchAllPages = async (
	baseUrl: string,
	headers: HeadersInit,
	options: FetchOptions,
): Promise<{ data: any[]; total_count: number }> => {
	const queryParams = new URLSearchParams({
		page: '1',
		per_page: String(options.perPage),
	});
	if (options.role) {
		queryParams.append('role', options.role);
	}

	const firstPage = await fetch(`${baseUrl}?${queryParams.toString()}`, {
		headers,
	});
	const firstPageData = await firstPage.json();
	const totalPages = Math.ceil(firstPageData.total_count / options.perPage);

	if (totalPages <= 1) return firstPageData;

	const otherPages = await Promise.all(
		Array.from({ length: totalPages - 1 }, (_, i) => {
			const pageParams = new URLSearchParams({
				page: String(i + 2),
				per_page: String(options.perPage),
			});
			if (options.role) {
				pageParams.append('role', options.role);
			}
			return fetch(`${baseUrl}?${pageParams.toString()}`, { headers })
				.then(res => res.json())
				.then(json => json.data);
		}),
	);

	return {
		data: [...firstPageData.data, ...otherPages.flat()],
		total_count: firstPageData.total_count,
	};
};

export default function PermitUsersComponent({ options }: Props) {
	const auth = useAuth();
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	const [result, setResult] = useState<{
		data: object[];
		total_count?: number;
		page?: number;
	}>({ data: [] });
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const performAction = async () => {
			let baseUrl = '';
			try {
				baseUrl = `https://api.permit.io/v2/facts/${
					auth.scope.project_id || options.projectId
				}/${auth.scope.environment_id || options.envId}`;
				const headers = {
					Authorization: `Bearer ${auth.authToken || options.apiKey}`,
					'Content-Type': 'application/json',
				};

				let response;
				switch (options.action) {
					case 'list':
						if (options.all) {
							let listUrl = options.tenantKey
								? `${baseUrl}/tenants/${options.tenantKey}/users`
								: `${baseUrl}/users`;

							if (options.role) {
								listUrl += `?role=${options.role}`;
							}

							const allData = await fetchAllPages(listUrl, headers, {
								perPage: options.perPage,
								role: options.role,
							});
							response = { ok: true, json: () => Promise.resolve(allData) };
						} else {
							const queryParams = new URLSearchParams({
								page: String(options.page),
								per_page: String(options.perPage),
							});

							if (options.role) {
								queryParams.append('role', options.role);
							}

							// Use different endpoint when filtering by tenant
							const listUrl = options.tenantKey
								? `${baseUrl}/tenants/${
										options.tenantKey
									}/users?${queryParams.toString()}`
								: `${baseUrl}/users?${queryParams.toString()}`;

							response = await fetch(listUrl, { headers });
						}
						break;
					case 'assign':
						if (!options.userId || !options.roleKey || !options.tenantKey) {
							throw new Error(
								'User ID, role key, and tenant key are required for assignment',
							);
						}
						response = await fetch(
							`${baseUrl}/users/${options.userId}/roles/${options.roleKey}`,
							{
								method: 'POST',
								headers,
								body: JSON.stringify({
									tenant: options.tenantKey,
								}),
							},
						);
						break;
					case 'unassign':
						if (!options.userId || !options.roleKey || !options.tenantKey) {
							throw new Error(
								'User ID, role key, and tenant key are required for unassignment',
							);
						}
						response = await fetch(
							`${baseUrl}/users/${options.userId}/roles/${options.roleKey}`,
							{
								method: 'DELETE',
								headers,
								body: JSON.stringify({
									tenant: options.tenantKey,
								}),
							},
						);
						break;
				}

				if (!response.ok) {
					throw new Error(`API request failed: ${response.statusText}`);
				}

				const data = await response.json();
				if (options.action === 'list') {
					data.data = data.data.map((user: any, index: number) => ({
						'#': (options.page - 1) * options.perPage + index + 1,
						...user,
						key: truncateKey(user.key, options.expandKey),
						tenant: getTenant(user.roles),
						roles: formatRoles(user.roles),
					}));
				}
				setResult(data);
				setStatus('done');
			} catch (error) {
				setResult({ data: [] });
				setStatus('error');
				setErrorMessage(
					error instanceof Error ? error.message : 'Unknown error occurred',
				);
			}
		};

		performAction();
	}, [options, auth.scope]);

	return (
		<Box flexDirection="column">
			{status === 'processing' && <Spinner type="dots" />}

			{status === 'done' &&
				options.action === 'list' &&
				!isObjectEmpty(result.data) && (
					<>
						<Text>
							Showing {result.data.length} items
							{options.all
								? ' | All items'
								: ` | Page ${result.page || options.page}`}{' '}
							|{' '}
							{result.total_count !== undefined
								? `Total Pages: ${result.total_count}`
								: ''}
						</Text>
						<TableComponent
							data={result.data}
							headers={[
								'#',
								'key',
								'email',
								'first_name',
								'last_name',
								'tenant',
								'roles',
							]}
							headersHexColor={'#89CFF0'}
						/>
					</>
				)}

			{status === 'done' && options.action !== 'list' && (
				<Box flexDirection="column">
					<Text color="green">✓ Operation completed successfully</Text>
					<Text>{JSON.stringify(result, null, 2)}</Text>
				</Box>
			)}

			{status === 'error' && <Text color="red">✗ Error: {errorMessage}</Text>}
		</Box>
	);
}

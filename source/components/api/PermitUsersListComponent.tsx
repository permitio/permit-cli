import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { type infer as zInfer } from 'zod';
import { options } from '../../commands/api/users/list.js';
import { useAuth } from '../AuthProvider.js';
import TableComponent from '../ui/Table.js';
import Spinner from 'ink-spinner';
import { usersApi, type UserData } from '../../utils/permitApi.js';

type Props = {
	options: zInfer<typeof options>;
};

// Transforms API data into table-friendly format while preserving type safety
interface TableUserData extends Omit<UserData, 'roles'> {
	'#': number; // Row number for better UX
	roles: string; // Flattened for display
}

// UI helpers - consider moving to separate utils if reused
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

// Main component handles data fetching, transformation and display
export default function PermitUsersListComponent({ options }: Props) {
	const auth = useAuth();
	// Track loading/error states for better UX
	const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
		'processing',
	);
	const [result, setResult] = useState<{
		data: TableUserData[];
		total_count: number;
		page: number;
	}>({
		data: [],
		total_count: 0,
		page: 1,
	});

	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Transform API response into display-ready format
	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await usersApi.list({
					auth,
					projectId: options.projectId,
					envId: options.envId,
					apiKey: options.apiKey,
					page: options.page,
					perPage: options.perPage,
					role: options.role,
					tenantKey: options.tenantKey,
				});

				if (!response.success) {
					throw new Error(response.error);
				}

				const rawUsersData = response.data?.data || [];
				const usersData: TableUserData[] = rawUsersData.map((user, index) => ({
					...user,
					'#': (options.page - 1) * options.perPage + index + 1,
					key: truncateKey(user.key, options.expandKey),
					tenant: getTenant(user.roles),
					roles: formatRoles(user.roles),
				}));

				setResult({
					data: usersData,
					total_count: response.data?.total_count || 0,
					page: response.data?.page || 1,
				});
				setStatus('done');
			} catch (error) {
				setResult({ data: [], total_count: 0, page: 0 });
				setStatus('error');
				setErrorMessage(
					error instanceof Error ? error.message : 'Unknown error occurred',
				);
			}
		};

		fetchData();
	}, [options, auth]);

	return (
		<Box flexDirection="column">
			{status === 'processing' && <Spinner type="dots" />}

			{status === 'done' && !isObjectEmpty(result.data) && (
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

			{status === 'error' && <Text color="red">✗ Error: {errorMessage}</Text>}
		</Box>
	);
}

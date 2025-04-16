// File: components/api/proxy/APIListProxyComponent.tsx
import React, { useEffect } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input'; // Optional: if you plan to support interactive pagination
import { useAuth } from '../../AuthProvider.js';
import { useListProxy } from '../../../hooks/useListProxy.js';

type Props = {
	options: {
		apiKey?: string;
		projectId?: string;
		envId?: string;
		expandKey: boolean;
		page: number;
		perPage: number;
	};
};

export default function APIListProxyComponent({ options }: Props) {
	const { scope } = useAuth();

	// Use the hook to fetch proxy configurations.
	// Use either the IDs provided in the options or those from the auth scope.
	const {
		status,
		errorMessage,
		proxies,
		listProxies,
		setPage, // For interactive pagination, if needed
	} = useListProxy(
		scope.project_id || options.projectId,
		scope.environment_id || options.envId,
		options.apiKey,
		options.page,
		options.perPage,
	);

	// Trigger the API call when the component is mounted and whenever dependent parameters change.
	useEffect(() => {
		listProxies();
	}, [listProxies]);

	// Render different states
	if (status === 'processing') {
		return (
			<Text>
				<Spinner type="dots" /> Loading proxy configs...
			</Text>
		);
	}

	if (status === 'error' && errorMessage) {
		return <Text color="red">Error: {errorMessage}</Text>;
	}

	if (status === 'done') {
		return (
			<>
				<Text color="green">Proxy Configs:</Text>
				{proxies.length === 0 && <Text>No proxy configs found.</Text>}
				{proxies.map((proxy) => (
					<Text key={proxy.id}>
						{options.expandKey
							? `Key: ${proxy.key} - `
							: `Key: ${proxy.key.substring(0, 8)}... - `}
						Name: {proxy.name} | Auth: {proxy.auth_mechanism}
					</Text>
				))}
				{/* Optional: Interactive pagination could be added here.
				<TextInput
					value={String(options.page)}
					onSubmit={(value) => {
						// parse and set the new page number
						const newPage = parseInt(value, 10);
						if (!isNaN(newPage)) {
							setPage(newPage);
							listProxies();
						}
					}}
				/> */}
			</>
		);
	}

	return null;
}

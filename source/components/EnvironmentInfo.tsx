import React, { useEffect, useState } from 'react';
import Spinner from 'ink-spinner';
import { Text, Box } from 'ink';
import { useAuth } from './AuthProvider.js';

export default function EnvironmentInfo() {
	const [state, setState] = useState<'loading' | 'loggedin' | 'notloggedin'>(
		'loading',
	);
	const { authToken, scope } = useAuth();

	useEffect(() => {
		// const apiKeyScope = async () => {
		// 	const { data, error } = await getApiKeyScope();
		// 	if (error || data === undefined) {
		// 		setError(error);
		// 		return;
		// 	}
		// 	setScope({
		// 		organization_id: data.organization_id,
		// 		project_id: data.project_id,
		// 		environment_id: data.environment_id,
		// 	});
		// };
		if (authToken === '') {
			setState('notloggedin');
		} else {
			setState('loggedin');
		}
	}, [authToken]);
	return (
		<>
			{state === 'loading' && (
				<Text>
					Loading Environment Info <Spinner type="dots" />
				</Text>
			)}
			{state === 'notloggedin' && (
				<Box
					display={'flex'}
					flexDirection={'column'}
					borderStyle="round"
					borderColor="cyan"
					width={'30%'}
					paddingLeft={1}
				>
					<Text color={'red'} dimColor={true}>
						You are not logged in. Use command{' '}
						<Text color={'green'}>login</Text> to login via cli.
					</Text>
				</Box>
			)}
			{state === 'loggedin' && scope && (
				<Box
					display={'flex'}
					flexDirection={'column'}
					borderStyle="round"
					borderColor="cyan"
					width={'30%'}
					paddingLeft={1}
				>
					<Text color={'green'}>You are logged in:</Text>
					<Text color={'green'}>OrganizationId: {scope.organization_id}</Text>
					<Text color={'green'}>ProjectId: {scope.project_id}</Text>
					<Text color={'green'}>EnvironmentId: {scope.environment_id}</Text>
				</Box>
			)}
		</>
	);
}

import React from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { useAuth } from './AuthProvider.js';

type Props = {
	opa?: number;
};

export default function PDPCommand({ opa }: Props) {
	const { authToken } = useAuth();
	return authToken ? (
		<>
			<Text color="green">Run the following command from your terminal:</Text>
			<Text wrap="end">
				docker run -p 7766:7000 {opa ? `-p ${opa}:8181` : ''} --env PDP_API_KEY=
				{authToken} --env PDP_DEBUG=true permitio/pdp-v2:latest
			</Text>
		</>
	) : (
		<Text>
			<Spinner type="dots" />
			Loading command
		</Text>
	);
}

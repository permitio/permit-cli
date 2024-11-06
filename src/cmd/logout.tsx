import React, { useEffect, useState } from 'react';
import Spinner from 'ink-spinner';
import { Text } from 'ink';
import { cleanAuthToken } from '../lib/token.js';

export default function Logout() {
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const clearSession = async () => {
			await cleanAuthToken();
			setLoading(false);
			process.exit(0);
		};

		clearSession();
	}, []);
	return loading ? (
		<Text>
			<Spinner type="dots" />
			Cleaning session...
		</Text>
	) : (
		<Text>Logged Out</Text>
	);
}

import React, { useEffect, useState } from 'react';
import Spinner from 'ink-spinner';
import { Text } from 'ink';
import { cleanAuthToken, loadAuthToken } from '../lib/auth.js';

export default function Logout() {
	const [loading, setLoading] = useState(true);
	const [alreadyLoggedOut, setAlreadyLoggedOut] = useState(false);

	useEffect(() => {
		const clearSession = async () => {
			try {
				// First check if there's a token to clean
				await loadAuthToken();

				// If we get here, there is a token - clean it
				await cleanAuthToken();
				setLoading(false);

				// Short delay before exit
				setTimeout(() => {
					process.exit(0);
				}, 100);
			} catch (error) {
				// Error from loadAuthToken means no token found - already logged out
				setAlreadyLoggedOut(true);
				setLoading(false);

				// Short delay before exit
				setTimeout(() => {
					process.exit(0);
				}, 100);
			}
		};

		clearSession();
	}, []);

	if (loading) {
		return (
			<Text>
				<Spinner type="dots" />
				Cleaning session...
			</Text>
		);
	}

	if (alreadyLoggedOut) {
		return <Text>Already logged out</Text>;
	}

	return <Text>Logged Out</Text>;
}

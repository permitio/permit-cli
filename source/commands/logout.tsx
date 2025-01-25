import React, { useEffect, useState } from 'react';
import Spinner from 'ink-spinner';
import { Text } from 'ink';
import { cleanAuthToken } from '../lib/auth.js';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('logout');

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
			{i18n('loading.message')}
		</Text>
	) : (
		<Text>{i18n('loggedOut.message')}</Text>
	);
}

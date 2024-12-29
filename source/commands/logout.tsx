import React, { useEffect, useState } from 'react';
import Spinner from 'ink-spinner';
import { Text } from 'ink';
import { cleanAuthToken } from '../lib/auth.js';
import i18next from 'i18next';

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
			{i18next.t('logout.loading')}
		</Text>
	) : (
		<Text>{i18next.t('logout.success')}</Text>
	);
}

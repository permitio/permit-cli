import { apiCall } from '../lib/api.js';
import { useMemo } from 'react';

// NO_DEPRECATION: This endpoints below are not present in openapi-spec
export const useAuthApi = () => {
	const authSwitchOrgs = async (
		workspaceId: string,
		accessToken?: string | null,
		cookie?: string | null,
	) => {
		return await apiCall(
			`v2/auth/switch_org/${workspaceId}`,
			accessToken ?? '',
			cookie ?? '',
			'POST',
		);
	};

	const getLogin = async (token: string | null) => {
		return await apiCall('v2/auth/login', token ?? '', '', 'POST');
	};

	return useMemo(
		() => ({
			authSwitchOrgs,
			getLogin,
		}),
		[],
	);
};

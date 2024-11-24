import { apiCall } from '../lib/api.js';

export const useAuthApi = () => {
	const authSwitchOrgs = async (
		workspaceId: string,
		accessToken: string | null,
		cookie: string | null,
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

	return {
		authSwitchOrgs,
		getLogin,
	};
};

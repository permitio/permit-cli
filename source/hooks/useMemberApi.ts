import { apiCall } from '../lib/api.js';

export const useMemberApi = () => {
	const inviteNewMember = async (authToken: string, body: any) => {
		return await apiCall(
			`v2/members`,
			authToken,
			null,
			'POST',
			JSON.stringify(body),
		);
	};

	return {
		inviteNewMember,
	};
};

import { apiCall } from '../lib/api.js';
import { useMemo } from 'react';

export const useMemberApi = () => {
	const inviteNewMember = async (
		authToken: string,
		body: object,
		inviter_name: string,
		inviter_email: string,
	) => {
		return await apiCall(
			`v2/members?inviter_name=${inviter_name}&inviter_email=${inviter_email}`,
			authToken,
			null,
			'POST',
			JSON.stringify(body),
		);
	};

	return useMemo(
		() => ({
			inviteNewMember,
		}),
		[],
	);
};

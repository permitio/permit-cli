import { useCallback, useMemo } from 'react';
import useClient from './useClient.js';
import { components } from '../lib/api/v1.js';

export type OrgMemberCreate = components['schemas']['OrgMemberCreate'];

export const useMemberApi = () => {
	const { authenticatedApiClient } = useClient();
	const inviteNewMember = useCallback(
		async (
			body: OrgMemberCreate,
			inviter_name: string,
			inviter_email: string,
		) => {
			return await authenticatedApiClient().POST(
				`/v2/members`,
				undefined,
				body,
				{
					inviter_email,
					inviter_name,
				},
			);
		},
		[authenticatedApiClient],
	);

	return useMemo(
		() => ({
			inviteNewMember,
		}),
		[inviteNewMember],
	);
};

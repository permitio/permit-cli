import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import {
	Organization,
	useOrganisationApi,
} from '../hooks/useOrganisationApi.js';
import i18next from 'i18next';

type SelectOrganizationProps = {
	accessToken: string;
	cookie?: string | null;
	onComplete: (organization: ActiveState) => void;
	workspace?: string;
	onError: (error: string) => void;
};

const SelectOrganization: React.FC<SelectOrganizationProps> = ({
	accessToken,
	cookie,
	onComplete,
	workspace,
	onError,
}) => {
	const [orgs, setOrgs] = useState<ActiveState[] | null>(null);
	const [loading, setLoading] = useState(true);

	const { getOrgs } = useOrganisationApi();

	const handleSelectOrganization = async (organization: object) => {
		const selectedOrg = organization as ActiveState;
		onComplete({ label: selectedOrg.label, value: selectedOrg.value });
	};

	useEffect(() => {
		const fetchOrgs = async () => {
			const { response: orgs, error } = await getOrgs(
				accessToken,
				cookie ?? '',
			);
			if (error) {
				onError(
					`${i18next.t('selectOrganization.failedToLoad')} ${i18next.t('selectOrganization.checkNetworkCredentials')}. ${i18next.t('selectOrganization.reason')}: ${error}`,
				);
				return;
			}

			if (workspace) {
				let userSpecifiedOrganization: Organization | undefined = orgs.find(
					(org: Organization) => org.name === workspace,
				);
				if (userSpecifiedOrganization) {
					onComplete({
						label: userSpecifiedOrganization.name,
						value: userSpecifiedOrganization.id,
					});
					return;
				} else {
					onError(
						`${i18next.t('selectOrganization.organizationNotFound')} "${workspace}". ${i18next.t('selectOrganization.verifyName')}`,
					);
					return;
				}
			}

			if (orgs.length === 1 && orgs[0]) {
				onComplete({
					label: orgs[0].name,
					value: orgs[0].id,
				});
			} else {
				setOrgs(
					orgs.map((org: Organization) => ({
						label: org.name,
						value: org.id,
					})),
				);
				setLoading(false);
			}
		};

		fetchOrgs();
		setLoading(false);
	}, [accessToken, cookie, getOrgs, onComplete, onError, workspace]);

	return (
		<>
			{loading && (
				<Text>
					<Spinner type="dots" /> {i18next.t('selectOrganization.loading')}
				</Text>
			)}

			{!loading && orgs && (
				<>
					<Text>{i18next.t('selectOrganization.selectPrompt')}</Text>
					<SelectInput items={orgs} onSelect={handleSelectOrganization} />
				</>
			)}
		</>
	);
};

export default SelectOrganization;

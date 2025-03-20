import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import {
	OrganizationReadWithAPIKey,
	useOrganisationApi,
} from '../hooks/useOrganisationApi.js';

type SelectOrganizationProps = {
	accessToken?: string;
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
			const { data: orgs, error } = await getOrgs(accessToken, cookie);
			if (error || !orgs) {
				onError(
					`Failed to load organizations. Reason: ${error}. Please check your network connection or credentials and try again.`,
				);
				return;
			}

			if (workspace) {
				let userSpecifiedOrganization: OrganizationReadWithAPIKey | undefined =
					orgs.find(
						(org: OrganizationReadWithAPIKey) => org.name === workspace,
					);
				if (userSpecifiedOrganization) {
					onComplete({
						label: userSpecifiedOrganization.name,
						value: userSpecifiedOrganization.id,
					});
					return;
				} else {
					onError(
						`Organization "${workspace}" not found. Please ensure the name is correct and try again.`,
					);
					return;
				}
			}

			if (orgs.length === 0) {
				onError('NO_ORGANIZATIONS');
				return;
			}

			if (orgs.length === 1 && orgs[0]) {
				onComplete({
					label: orgs[0].name,
					value: orgs[0].id,
				});
			} else {
				setOrgs(
					orgs.map((org: OrganizationReadWithAPIKey) => ({
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
					<Spinner type="dots" /> Loading Organizations...
				</Text>
			)}

			{!loading && orgs && (
				<>
					<Text>Select an organization</Text>
					<SelectInput items={orgs} onSelect={handleSelectOrganization} />
				</>
			)}
		</>
	);
};

export default SelectOrganization;

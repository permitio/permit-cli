import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import {
	Organization,
	useOrganisationApi,
} from '../hooks/useOrganisationApi.js';

type SelectOrganizationProps = {
	accessToken: string;
	cookie: string;
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
	const [orgs, setOrgs] = useState<ActiveState[]>([]);
	const [loading, setLoading] = useState(true);

	const { getOrgs } = useOrganisationApi();

	const handleSelectOrganization = async (organization: object) => {
		const selectedOrg = organization as ActiveState;
		onComplete({ label: selectedOrg.label, value: selectedOrg.value });
	};

	useEffect(() => {
		const fetchOrgs = async () => {
			const { response: orgs, error } = await getOrgs(accessToken, cookie);

			if (error) {
				onError(
					`Failed to load organizations. Reason: ${error}. Please check your network connection or credentials and try again.`,
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
						`Organization "${workspace}" not found. Please ensure the name is correct and try again.`,
					);
					return;
				}
			}

			setOrgs(
				orgs.map((org: Organization) => ({ label: org.name, value: org.id })),
			);
			setLoading(false);
		};

		fetchOrgs();
		setLoading(false);
	}, [accessToken, cookie]);

	return (
		<>
			{loading && (
				<Text>
					<Spinner type="dots" /> Loading Organizations...
				</Text>
			)}

			{!loading && (
				<>
					<Text>Select an organization</Text>
					<SelectInput items={orgs} onSelect={handleSelectOrganization} />
				</>
			)}
		</>
	);
};

export default SelectOrganization;

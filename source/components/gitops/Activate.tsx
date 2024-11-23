import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { activateRepo, configurePermit } from '../../lib/gitops/utils.js';
type GitConfig = {
	url: string;
	main_branch_name: string;
	credentials: {
		auth_type: string;
		username: string;
		private_key: string;
	};
	key: string;
};
type Props = {
	accessToken: string;
	projectKey: string;
	config: GitConfig;
	onActivate: (isConfigured: boolean) => void;
	onError: (error: string) => void;
};
type ActivateSelect = {
	label: string;
	value: boolean;
};

const Activate: React.FC<Props> = ({
	accessToken,
	projectKey,
	config,
	onActivate,
	onError,
}) => {
	const [GitConfigResponse, setGitConfigRespone] = useState<{
		id: string;
		status: string;
		key: string;
	}>({ id: '', status: '', key: '' });
	const activateItemSelect = [
		{
			label: 'Yes',
			value: true,
		},
		{
			label: 'No',
			value: false,
		},
	];
	useEffect(() => {
		configurePermit(accessToken, projectKey, config)
			.then(response => {
				setGitConfigRespone(response);
			})
			.catch(error => {
				onError(error.message);
			});
	}, []);

	const handleActivateSelect = (activate: ActivateSelect) => {
		if (activate.value) {
			activateRepo(accessToken, projectKey, GitConfigResponse.key)
				.then(resp => {
					onActivate(resp);
				})
				.catch(error => {
					onError(error.message);
				});
		}
		if (!activate.value) {
			onActivate(false);
		}
	};
	return (
		<>
			<Box margin={1}>
				<Box margin={1}>
					<Text color={'yellow'}>Do you want to activate the repository?</Text>
				</Box>
				<SelectInput
					items={activateItemSelect}
					onSelect={handleActivateSelect}
				/>
			</Box>
		</>
	);
};

export default Activate;

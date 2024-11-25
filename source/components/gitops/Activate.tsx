import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { activateRepo } from '../../lib/gitops/utils.js';

type Props = {
	apiKey: string;
	projectKey: string;
	repoKey: string;
	onActivate: (isConfigured: boolean) => void;
	onError: (error: string) => void;
};
type ActivateSelect = {
	label: string;
	value: boolean;
};

const Activate: React.FC<Props> = ({
	apiKey,
	projectKey,
	repoKey,
	onActivate,
	onError,
}) => {
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

	const handleActivateSelect = async (activate: ActivateSelect) => {
		if (activate.value) {
			try {
				const activationResp = await activateRepo(apiKey, projectKey, repoKey);
				onActivate(activationResp);
			} catch (error) {
				onError(error instanceof Error ? error.message : String(error));
			}
		}
		if (!activate.value) {
			onActivate(false);
		}
	};
	return (
		<>
			<Box margin={1}>
				<Box margin={1}>
					<Text>Do you want to activate the repository?{'\n'}</Text>
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

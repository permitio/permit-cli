import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';

type Props = {
	accessToken: string;
	cookie: string;
	activeProject: ActiveState;
	onComplete: (environment: ActiveState) => void;
	onError: (error: string) => void;
};

const SelectEnvironment: React.FC<Props> = ({
	accessToken,
	cookie,
	onComplete,
	activeProject,
	onError,
}) => {
	const [environments, setEnvironments] = useState<ActiveState[]>([]);
	const [state, setState] = useState<boolean>(true);

	const { getEnvironments } = useEnvironmentApi();

	const handleEnvironmentSelect = (environment: object) => {
		const selectedEnv = environment as ActiveState;
		onComplete({ label: selectedEnv.label, value: selectedEnv.value });
	};

	useEffect(() => {
		const fetchEnvironments = async () => {
			const { response: environments, error } = await getEnvironments(
				activeProject.value,
				accessToken,
				cookie,
			);

			if (error) {
				onError(
					`Failed to load environments for project "${activeProject.label}". Reason: ${error}. Please check your network connection or credentials and try again.`,
				);
				return;
			}

			if (environments.length === 1 && environments[0]) {
				onComplete({ label: environments[0].name, value: environments[0].id });
			}

			setEnvironments(
				environments.map(env => ({ label: env.name, value: env.id })),
			);
		};
		fetchEnvironments();
		setState(false);
	}, [accessToken, cookie]);

	return (
		<>
			{state && (
				<Text>
					<Spinner type="dots" /> Loading Environments...
				</Text>
			)}
			{!state && (
				<>
					<Text>Select an environment</Text>
					<SelectInput
						items={environments}
						onSelect={handleEnvironmentSelect}
					/>
				</>
			)}
		</>
	);
};

export default SelectEnvironment;

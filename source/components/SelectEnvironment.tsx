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

const SelectEnvironment: React.FC<Props> = ({ accessToken, cookie, onComplete, activeProject, onError }) => {
	const [environments, setEnvironments] = useState<[]>([]);
	const [state, setState] = useState<boolean>(true);

	const { getEnvironments } = useEnvironmentApi();

	const fetchEnvironments = async () => {
		const { response: environments, error } = await getEnvironments(activeProject.value, accessToken, cookie);

		if (error) {
			onError(`Failed to load environments for project "${activeProject.label}". Reason: ${error}. Please check your network connection or credentials and try again.`);
		}

		setEnvironments(
			environments.map((env: any) => ({ label: env.name, value: env.id })),
		);
	};

	const handleEnvironmentSelect = (environment: any) => {
		onComplete({ label: environment.label, value: environment.value });
	};

	useEffect(() => {
		fetchEnvironments().then(_ => setState(false));
	}, [accessToken, cookie]);

	return (
		<>
			{
				state &&
				<Text>
					<Spinner type="dots" /> Loading Environments...
				</Text>

			}
			{
				!state &&
				<>
					<Text>Select an environment</Text>
					<SelectInput
						items={environments}
						onSelect={handleEnvironmentSelect}
					/>
				</>
			}
		</>
	);
};

export default SelectEnvironment;

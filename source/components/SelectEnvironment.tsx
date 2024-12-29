import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';
import i18next from 'i18next';

type Props = {
	accessToken: string;
	cookie?: string | null;
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
					`${i18next.t('selectEnvironment.failedToLoad')} "${activeProject.label}". ${i18next.t('selectEnvironment.errorReason')} ${error}. ${i18next.t('selectEnvironment.checkNetworkCredentials')}`,
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
	}, [
		accessToken,
		activeProject.label,
		activeProject.value,
		cookie,
		getEnvironments,
		onComplete,
		onError,
	]);

	return (
		<>
			{state && (
				<Text>
					<Spinner type="dots" /> {i18next.t('selectEnvironment.loading')}
				</Text>
			)}
			{!state && (
				<>
					<Text>{i18next.t('selectEnvironment.selectPrompt')}</Text>
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

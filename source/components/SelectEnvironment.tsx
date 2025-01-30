import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('common.selectEnvironment');

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
				onError(i18n('loadEnv.error', { project: activeProject.label, error }));
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
					<Spinner type="dots" />
					{i18n('loadingEnv.message')}
				</Text>
			)}
			{!state && (
				<>
					<Text>{i18n('selectEnv.message')}</Text>
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

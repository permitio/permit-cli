import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useProjectAPI } from '../hooks/useProjectAPI.js';
import i18next from 'i18next';

type Props = {
	accessToken: string;
	cookie?: string | null;
	onComplete: (project: ActiveState) => void;
	onError: (error: string) => void;
};

const SelectProject: React.FC<Props> = ({
	accessToken,
	cookie,
	onComplete,
	onError,
}) => {
	const [projects, setProjects] = useState<ActiveState[]>([]);
	const [loading, setLoading] = useState(true);

	const { getProjects } = useProjectAPI();

	const handleProjectSelect = (project: object) => {
		const selectedProject = project as ActiveState;
		onComplete({ label: selectedProject.label, value: selectedProject.value });
	};

	useEffect(() => {
		const fetchProjects = async () => {
			const { response: projects, error } = await getProjects(
				accessToken,
				cookie,
			);

			if (error) {
				onError(
					`${i18next.t('selectProject.failedToLoad')} ${i18next.t('selectProject.checkNetworkCredentials')}. ${i18next.t('selectProject.reason')}: ${error}`,
				);
				return;
			}

			if (projects.length === 1 && projects[0]) {
				onComplete({ label: projects[0].name, value: projects[0].id });
			}

			setProjects(
				projects.map(project => ({ label: project.name, value: project.id })),
			);
			setLoading(false);
		};

		fetchProjects();
		setLoading(false);
	}, [accessToken, cookie, getProjects, onComplete, onError]);

	return loading ? (
		<Text>
			<Spinner type="dots" /> {i18next.t('selectProject.loading')}
		</Text>
	) : (
		<>
			<Text>{i18next.t('selectProject.selectPrompt')}</Text>
			<SelectInput items={projects} onSelect={handleProjectSelect} />
		</>
	);
};

export default SelectProject;

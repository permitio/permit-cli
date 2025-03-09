import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useProjectAPI } from '../hooks/useProjectAPI.js';
import { useUnauthenticatedApi } from '../hooks/useUnauthenticatedApi.js';

type Props = {
	accessToken?: string;
	cookie?: string | null;
	onComplete: (project: ActiveState) => void;
	onError: (error: string) => void;
	notInAuthContext?: boolean;
};

const SelectProject: React.FC<Props> = ({
	accessToken,
	cookie,
	onComplete,
	onError,
	notInAuthContext,
}) => {
	const [projects, setProjects] = useState<ActiveState[]>([]);
	const [loading, setLoading] = useState(true);

	const { getProjects } = useProjectAPI();
	const { getProjects: getProjectsUnauthenticated } = useUnauthenticatedApi();

	const handleProjectSelect = (project: object) => {
		const selectedProject = project as ActiveState;
		onComplete({ label: selectedProject.label, value: selectedProject.value });
	};

	useEffect(() => {
		const fetchProjects = async () => {
			const { data: projects, error } = notInAuthContext
				? await getProjectsUnauthenticated(accessToken ?? '', cookie)
				: await getProjects();

			if (error || !projects) {
				onError(
					`Failed to load projects. Reason: ${error}. Please check your network connection or credentials and try again.`,
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
	}, [
		accessToken,
		cookie,
		getProjects,
		getProjectsUnauthenticated,
		notInAuthContext,
		onComplete,
		onError,
	]);

	return loading ? (
		<Text>
			<Spinner type="dots" /> Loading Projects...
		</Text>
	) : (
		<>
			<Text>Select a project</Text>
			<SelectInput items={projects} onSelect={handleProjectSelect} />
		</>
	);
};

export default SelectProject;

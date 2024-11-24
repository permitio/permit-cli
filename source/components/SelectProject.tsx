import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ActiveState } from './EnvironmentSelection.js';
import { useProjectAPI } from '../hooks/useProjectAPI.js';

type Props = {
	accessToken: string;
	cookie: string;
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

	const handleProjectSelect = (project: any) => {
		onComplete({ label: project.label, value: project.value });
	};

	useEffect(() => {
		const fetchProjects = async () => {
			const { response: projects, error } = await getProjects(
				accessToken,
				cookie,
			);

			if (error) {
				onError(
					`Failed to load projects. Reason: ${error}. Please check your network connection or credentials and try again.`,
				);
				return;
			}

			setProjects(
				projects.map(project => ({ label: project.name, value: project.id })),
			);
			setLoading(false);
		};

		fetchProjects();

		setLoading(false);
	}, [accessToken, cookie]);

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

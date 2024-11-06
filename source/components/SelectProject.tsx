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

const SelectProject: React.FC<Props> = ({ accessToken, cookie, onComplete, onError }) => {
	const [projects, setProjects] = useState<[]>([]);
	const [loading, setLoading] = useState(true);

	const { getProjects } = useProjectAPI();

	const fetchProjects = async () => {
		const { response: projects, error } = await getProjects(accessToken, cookie);

		if (error) {
			onError(`Failed to load projects. Reason: ${error}. Please check your network connection or credentials and try again.`);
		}

		setProjects(projects.map((project: any) => ({ label: project.name, value: project.id })));
		setLoading(false);
	};

	const handleProjectSelect = (project: any) => {
		onComplete({ label: project.label, value: project.value });
	};

	useEffect(() => {
		fetchProjects().then(_ => setLoading(false));
	}, [accessToken, cookie]);

	return loading ? (
		<Text>
			<Spinner type="dots" /> Loading Projects...
		</Text>
	) : (
		<>
			<Text>Select a project</Text>
			<SelectInput
				items={projects}
				onSelect={handleProjectSelect} // Replace with state handling
			/>
		</>
	);
};

export default SelectProject;

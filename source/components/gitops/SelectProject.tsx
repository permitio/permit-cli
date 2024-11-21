import React, { useEffect, useState } from 'react';
import { getProjectList } from '../../lib/gitops/utils.js';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';

type Props = {
	accessToken: string;
	onProjectSubmit: (project: string) => void;
	onError: (error: string) => void;
};

const SelectProject: React.FC<Props> = ({
	accessToken,
	onProjectSubmit,
	onError,
}) => {
	const [projects, setProjects] = useState<{ label: string; value: string }[]>(
		[],
	);
	const [loading, setLoading] = useState<boolean>(true);
	const [_, setSelectedProject] = useState<string>('');

	useEffect(() => {
		getProjectList(accessToken)
			.then(projects => {
				setProjects(
					projects.map(project => ({ label: project.key, value: project.key })),
				);
				setLoading(false);
			})
			.catch(error => {
				onError(error.message);
			});
	}, []);

	const handleSubmit = (project: string) => {
		onProjectSubmit(project);
	};

	return (
		<>
			{loading && <Text>Loading projects...</Text>}
			{!loading && (
				<>
					<Text color={'blue'}> Select Your Project: </Text>
					<SelectInput
						items={projects}
						onSelect={project => {
							setSelectedProject(project.value);
							handleSubmit(project.value);
						}}
					/>
				</>
			)}
		</>
	);
};

export default SelectProject;

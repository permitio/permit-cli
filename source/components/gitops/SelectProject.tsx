import React, { useCallback, useState } from 'react';
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

	const retriveProject = useCallback(async () => {
		try {
			const projects = await getProjectList(accessToken);
			setProjects(
				projects.map(project => ({
					label: project.name,
					value: project.key,
				})),
			);
			setLoading(false);
		} catch (error) {
			onError(error instanceof Error ? error.message : String(error));
		}
	}, [accessToken, onError]);

	if (loading) {
		retriveProject();
	}

	return (
		<>
			{loading && <Text>Loading projects...</Text>}
			{!loading && (
				<>
					<Text> Select Your Project: </Text>
					<SelectInput
						items={projects}
						onSelect={project => {
							onProjectSubmit(project.value);
						}}
					/>
				</>
			)}
		</>
	);
};

export default SelectProject;

import React, { useCallback, useEffect, useState } from 'react';
import { getProjectList } from '../../lib/gitops/utils.js';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import { getNamespaceIl18n } from '../../lib/i18n.js';
const i18n = getNamespaceIl18n('gitops.create.github');

type Props = {
	apiKey: string;
	onProjectSubmit: (project: string) => void;
	onError: (error: string) => void;
};

const SelectProject: React.FC<Props> = ({
	apiKey,
	onProjectSubmit,
	onError,
}) => {
	const [projects, setProjects] = useState<{ label: string; value: string }[]>(
		[],
	);
	const [loading, setLoading] = useState<boolean>(true);

	const retriveProject = useCallback(async () => {
		try {
			const projects = await getProjectList(apiKey);
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
	}, [apiKey, onError]);

	useEffect(() => {
		retriveProject();
	}, [retriveProject]);

	return (
		<>
			{loading && <Text>{i18n('loadingProjects.message')}</Text>}
			{!loading && (
				<>
					<Text>{i18n('selectProject.message')}</Text>
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

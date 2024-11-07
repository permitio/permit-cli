import React, { useState } from 'react';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';
import SelectEnvironment from './SelectEnvironment.js';
import { useAuthApi } from '../hooks/useAuthApi.js';
import { useApiKeyApi } from '../hooks/useApiKeyApi.js';


type Props = {
	accessToken: string;
	cookie: string;
	workspace?: string;
	onComplete: (organisation: string, project: string, environment: string, secret: string) => void;
	onError: (error: string) => void;
};

export interface ActiveState {
	label: string;
	value: string;
}


const EnvironmentSelection: React.FC<Props> = ({ accessToken, cookie, onComplete, onError, workspace }) => {

	const defaultActiveState: ActiveState = {
		label: '',
		value: '',
	};

	const [state, setState] = useState<'workspace' | 'project' | 'environment'>('workspace');
	const [activeOrganization, setActiveOrganization] = useState<ActiveState>(defaultActiveState);
	const [activeProject, setActiveProject] = useState<ActiveState>(defaultActiveState);
	const [activeEnvironment, setActiveEnvironment] = useState<ActiveState>(defaultActiveState);
	const [envCookie, setEnvCookie] = useState<string>(cookie);

	const { authSwitchOrgs } = useAuthApi();
	const { getProjectEnvironmentApiKey } = useApiKeyApi();

	async function handleSelectActiveOrganization(organization: ActiveState) {

		if (cookie) {
			const { headers, error } = await authSwitchOrgs(organization.value, accessToken, cookie);

			if (error) {
				onError(`Error while selecting active workspace: ${error}`);
			}

			let newCookie = headers.getSetCookie()[0] ?? '';
			setEnvCookie(newCookie);
		}
		setActiveOrganization(organization);
		setState('project');
	}

	function handleSelectActiveProject(project: ActiveState) {
		setActiveProject(project);
		setState('environment');
	}

	async function handleSelectActiveEnvironment(environment: ActiveState) {

		const {
			response,
			error,
		} = await getProjectEnvironmentApiKey(activeProject.value, environment.value, cookie, accessToken);

		if (error) {
			onError(`Error while getting Environment Secret: ${error}`);
		}

		onComplete(activeOrganization.label, activeProject.label, environment.label, response.secret);

		setActiveEnvironment(environment);
		setActiveEnvironment(environment);

	}

	return (
		<>
			{state === 'workspace' &&
				<SelectOrganization accessToken={accessToken} cookie={envCookie} onComplete={handleSelectActiveOrganization}
														onError={onError} workspace={workspace} />}

			{state === 'project' &&
				<SelectProject accessToken={accessToken} cookie={envCookie} onComplete={handleSelectActiveProject}
											 onError={onError} />}

			{state === 'environment' &&
				<SelectEnvironment accessToken={accessToken} cookie={envCookie} activeProject={activeProject}
													 onComplete={handleSelectActiveEnvironment} onError={onError} />}
		</>
	)
		;
};

export default EnvironmentSelection;

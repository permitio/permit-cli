import React, { useEffect, useState } from 'react';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';
import SelectEnvironment from './SelectEnvironment.js';
import { useAuthApi } from '../hooks/useAuthApi.js';
import { useApiKeyApi } from '../hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';
import { useOrganisationApi } from '../hooks/useOrganisationApi.js';
import { Text } from 'ink';


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

	const [state, setState] = useState<'initial' | 'workspace' | 'project' | 'environment' | 'user-key' | 'done'>('initial');
	const [activeOrganization, setActiveOrganization] = useState<ActiveState>(defaultActiveState);
	const [activeProject, setActiveProject] = useState<ActiveState>(defaultActiveState);
	const [activeEnvironment, setActiveEnvironment] = useState<ActiveState>(defaultActiveState);
	const [envCookie, setEnvCookie] = useState<string>(cookie);

	const { authSwitchOrgs } = useAuthApi();
	const { getProjectEnvironmentApiKey, getApiKeyScope } = useApiKeyApi();
	const { getEnvironment } = useEnvironmentApi();
	const { getOrg } = useOrganisationApi();

	useEffect(() => {
		getApiKeyScope(accessToken).then(async res => {
			const { response: scope, error, status } = res;
			if (error) {
				let errorMsg;
				if (status === 401) {
					errorMsg = `Invalid ApiKey, ${error}`;
				} else {
					errorMsg = `Error while getting scopes for the ApiKey: ${error}`;
				}
				onError(errorMsg);
				return;
			}
			if (scope.environment_id && scope.project_id) {
				setState('user-key');
				const { response: project } = await getEnvironment(scope.project_id, scope.environment_id, accessToken, cookie);
				const { response: organization } = await getOrg(scope.organization_id, accessToken, cookie);
				onComplete(organization.name, '', project.name, accessToken);
			} else {
				setState('workspace');
			}
		});
	}, [accessToken]);

	async function handleSelectActiveOrganization(organization: ActiveState) {

		if (cookie) {
			const { headers, error } = await authSwitchOrgs(organization.value, accessToken, cookie);

			if (error) {
				onError(`Error while selecting active workspace: ${error}`);
				return;
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
			return;
		}
		setActiveEnvironment(environment);
		setState('done');
		onComplete(activeOrganization.label, activeProject.label, environment.label, response.secret);
	}

	return (
		<>
			{
				state === 'user-key' &&
				<Text>
					User provided ApiKey has environment scope.
				</Text>
			}
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

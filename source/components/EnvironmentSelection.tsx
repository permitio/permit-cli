import React, { useEffect, useState, useCallback } from 'react';
import SelectOrganization from './SelectOrganization.js';
import SelectProject from './SelectProject.js';
import SelectEnvironment from './SelectEnvironment.js';
import { useAuthApi } from '../hooks/useAuthApi.js';
import { useApiKeyApi } from '../hooks/useApiKeyApi.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';
import { useOrganisationApi } from '../hooks/useOrganisationApi.js';
import { Text } from 'ink';
import { getNamespaceIl18n } from '../lib/i18n.js';
const i18n = getNamespaceIl18n('common.environmentSelection');

export interface ActiveState {
	label: string;
	value: string;
}

type Props = {
	accessToken: string;
	cookie?: string | null;
	workspace?: string;
	onComplete: (
		organisation: ActiveState,
		project: ActiveState,
		environment: ActiveState,
		secret: string,
	) => void;
	onError: (error: string) => void;
};

const EnvironmentSelection: React.FC<Props> = ({
	accessToken,
	cookie,
	onComplete,
	onError,
	workspace,
}) => {
	const defaultActiveState: ActiveState = {
		label: '',
		value: '',
	};

	const [state, setState] = useState<
		'initial' | 'workspace' | 'project' | 'environment' | 'user-key' | 'done'
	>('initial');
	const [activeOrganization, setActiveOrganization] =
		useState<ActiveState>(defaultActiveState);
	const [activeProject, setActiveProject] =
		useState<ActiveState>(defaultActiveState);
	const [envCookie, setEnvCookie] = useState<string | undefined>(undefined);

	const isBrowserMode = !!cookie;

	const { authSwitchOrgs } = useAuthApi();
	const { getProjectEnvironmentApiKey, getApiKeyScope } = useApiKeyApi();
	const { getEnvironment } = useEnvironmentApi();
	const { getOrg } = useOrganisationApi();

	const stableOnComplete = useCallback(onComplete, [onComplete]);
	const stableOnError = useCallback(onError, [onError]);

	useEffect(() => {
		// No need to verify scope on browser login
		if (!cookie) {
			(async () => {
				const {
					response: scope,
					error,
					status,
				} = await getApiKeyScope(accessToken);

				if (error) {
					let errorMsg;
					if (status === 401) {
						errorMsg = i18n('invalidApiKey.error', { error });
					} else {
						errorMsg = i18n('apiKeyScope.error', { error });
					}
					stableOnError(errorMsg);
					return;
				}
				if (scope.environment_id && scope.project_id) {
					setState('user-key');
					const { response: environment } = await getEnvironment(
						scope.project_id,
						scope.environment_id,
						accessToken,
						cookie,
					);
					const { response: organization } = await getOrg(
						scope.organization_id,
						accessToken,
						cookie,
					);
					stableOnComplete(
						{ label: organization.name, value: organization.id },
						{
							label: '',
							value: environment.project_id,
						},
						{ label: environment.name, value: environment.id },
						accessToken,
					);
				} else {
					setState('workspace');
				}
			})();
		} else {
			setState('workspace');
		}
	}, [
		accessToken,
		cookie,
		getApiKeyScope,
		getEnvironment,
		getOrg,
		stableOnError,
		stableOnComplete,
	]);

	const handleSelectActiveOrganization = useCallback(
		async (organization: ActiveState) => {
			if (isBrowserMode) {
				const { headers, error } = await authSwitchOrgs(
					organization.value,
					accessToken,
					cookie,
				);

				if (error) {
					stableOnError(i18n('selectWorkspace.error', { error }));
					return;
				}

				let newCookie = headers.getSetCookie()[0] ?? '';
				setEnvCookie(newCookie);
			}
			setActiveOrganization(organization);
			setState('project');
		},
		[accessToken, authSwitchOrgs, cookie, isBrowserMode, stableOnError],
	);

	const handleSelectActiveProject = useCallback((project: ActiveState) => {
		setActiveProject(project);
		setState('environment');
	}, []);

	const handleSelectActiveEnvironment = useCallback(
		async (environment: ActiveState) => {
			const { response, error } = await getProjectEnvironmentApiKey(
				activeProject.value,
				environment.value,
				cookie ?? '',
				accessToken,
			);

			if (error) {
				stableOnError(i18n('envSecret.error', { error }));
				return;
			}

			setState('done');
			stableOnComplete(
				activeOrganization,
				activeProject,
				environment,
				response.secret,
			);
		},
		[
			accessToken,
			activeOrganization,
			activeProject,
			cookie,
			getProjectEnvironmentApiKey,
			stableOnComplete,
			stableOnError,
		],
	);

	return (
		<>
			{state === 'user-key' && (
				<Text>{i18n('userKey.message')}</Text>
			)}
			{state === 'workspace' && (
				<SelectOrganization
					accessToken={accessToken}
					cookie={cookie}
					onComplete={handleSelectActiveOrganization}
					onError={stableOnError}
					workspace={workspace}
				/>
			)}

			{state === 'project' && (isBrowserMode ? envCookie : true) && (
				<SelectProject
					accessToken={accessToken}
					cookie={envCookie}
					onComplete={handleSelectActiveProject}
					onError={stableOnError}
				/>
			)}

			{state === 'environment' && (isBrowserMode ? envCookie : true) && (
				<SelectEnvironment
					accessToken={accessToken}
					cookie={envCookie}
					activeProject={activeProject}
					onComplete={handleSelectActiveEnvironment}
					onError={stableOnError}
				/>
			)}
		</>
	);
};

export default EnvironmentSelection;

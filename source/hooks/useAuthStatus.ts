import { useState, useEffect } from 'react';
import { loadAuthToken } from '../lib/auth.js';
import { useApiKeyApi } from './useApiKeyApi.js';
import { useOrganisationApi } from './useOrganisationApi.js';
import { useProjectAPI } from './useProjectAPI.js';
import { useEnvironmentApi } from './useEnvironmentApi.js';
import { globalTokenGetterSetter } from './useClient.js';

interface Project {
	id: string;
	name: string;
}

interface Environment {
	id: string;
	name: string;
}

interface AuthData {
	organization: {
		id: string;
		name: string;
	};
	project: Project | null;
	environment: Environment | null;
}

interface AuthStatusResult {
	loading: boolean;
	loggedIn: boolean;
	authData: AuthData;
	error: string | null;
}

export function useAuthStatus(): AuthStatusResult {
	const [loading, setLoading] = useState<boolean>(true);
	const [loggedIn, setLoggedIn] = useState<boolean>(false);
	const [authData, setAuthData] = useState<AuthData>({
		organization: { id: '', name: '' },
		project: null,
		environment: null,
	});
	const [error, setError] = useState<string | null>(null);

	const apiKeyApi = useApiKeyApi();
	const orgApi = useOrganisationApi();
	const projectApi = useProjectAPI();
	const environmentApi = useEnvironmentApi();

	useEffect(() => {
		let isMounted = true;

		const fetchAuthData = async (): Promise<void> => {
			try {
				// Try to load the auth token
				const token = await loadAuthToken().catch(() => null);

				if (!token) {
					if (isMounted) {
						setLoggedIn(false);
						setLoading(false);
					}
					return;
				}

				// Store token in global state for API client
				globalTokenGetterSetter.tokenSetter(token);

				// Get the scope of the API key
				const scopeResult = await apiKeyApi.getApiKeyScope(token);

				if (scopeResult.error) {
					throw new Error(scopeResult.error);
				}

				const scope = scopeResult.data;
				if (!scope) {
					throw new Error('Failed to get API key scope');
				}

				// Initialize data structure
				const data: AuthData = {
					organization: { id: scope.organization_id || '', name: '' },
					project: scope.project_id ? { id: scope.project_id, name: '' } : null,
					environment: scope.environment_id
						? { id: scope.environment_id, name: '' }
						: null,
				};

				// Fetch entity details in parallel
				const [orgResponse, projectsResponse, envsResponse] = await Promise.all(
					[
						// Fetch organization name
						scope.organization_id
							? orgApi.getOrg(scope.organization_id, token)
							: Promise.resolve({ data: null, error: null }),

						// Fetch projects
						scope.project_id
							? projectApi.getProjects(token)
							: Promise.resolve({ data: [], error: null }),

						// Fetch environments
						scope.project_id && scope.environment_id
							? environmentApi.getEnvironments(scope.project_id, token)
							: Promise.resolve({ data: [], error: null }),
					],
				);

				// Update organization name if available
				if (orgResponse.data) {
					data.organization.name = orgResponse.data.name;
				}

				// Update project name if available
				if (projectsResponse.data && data.project) {
					const matchingProject = projectsResponse.data.find(
						p => p.id === data.project?.id,
					);
					if (matchingProject) {
						data.project.name = matchingProject.name;
					}
				}

				// Update environment name if available
				if (envsResponse.data && data.environment) {
					const matchingEnv = envsResponse.data.find(
						e => e.id === data.environment?.id,
					);
					if (matchingEnv) {
						data.environment.name = matchingEnv.name;
					}
				}

				if (isMounted) {
					setLoggedIn(true);
					setAuthData(data);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err.message : String(err));
					setLoggedIn(false);
					setLoading(false);
				}
			}
		};

		fetchAuthData();

		return () => {
			isMounted = false;
		};
	}, [apiKeyApi, environmentApi, orgApi, projectApi]);

	return { loading, loggedIn, authData, error };
}

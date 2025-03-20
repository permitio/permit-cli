import { useState, useEffect } from 'react';
import { loadAuthToken } from '../lib/auth.js';
import { useApiKeyApi } from '../hooks/useApiKeyApi.js';
import { useOrganisationApi } from '../hooks/useOrganisationApi.js';
import { useProjectAPI } from '../hooks/useProjectAPI.js';
import { useEnvironmentApi } from '../hooks/useEnvironmentApi.js';

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
    environment: null
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
          setLoggedIn(false);
          return;
        }
        
        // Get the scope of the API key
        const { response: scope, error: scopeError } = await apiKeyApi.getApiKeyScope(token);
        
        if (scopeError) {
          throw new Error(scopeError);
        }
        
        // Initialize data structure
        const data: AuthData = {
          organization: { id: scope.organization_id, name: '' },
          project: scope.project_id ? { id: scope.project_id, name: '' } : null,
          environment: scope.environment_id ? { id: scope.environment_id, name: '' } : null
        };
        
        // Fetch entity details in parallel
        const [orgResponse, projectsResponse, envsResponse] = await Promise.all([
          // Fetch organization name
          scope.organization_id ? orgApi.getOrg(scope.organization_id, token) : Promise.resolve({ response: null }),
          
          // Fetch projects
          scope.project_id ? projectApi.getProjects(token) : Promise.resolve({ response: [] }),
          
          // Fetch environments
          (scope.project_id && scope.environment_id) ? 
            environmentApi.getEnvironments(scope.project_id, token) : 
            Promise.resolve({ response: [] })
        ]);
        
        // Update organization name if available
        if (orgResponse.response) {
          data.organization.name = orgResponse.response.name;
        }
        
        // Update project name if available
        if (projectsResponse.response && data.project) {
          const matchingProject = projectsResponse.response.find(p => p.id === data.project?.id);
          if (matchingProject) {
            data.project.name = matchingProject.name;
          }
        }
        
        // Update environment name if available
        if (envsResponse.response && data.environment) {
          const matchingEnv = envsResponse.response.find(e => e.id === data.environment?.id);
          if (matchingEnv) {
            data.environment.name = matchingEnv.name;
          }
        }
        
        if (isMounted) {
          setLoggedIn(true);
          setAuthData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoggedIn(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchAuthData();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return { loading, loggedIn, authData, error };
}
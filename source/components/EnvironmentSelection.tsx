import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { apiCall } from '../lib/api.js';

interface SelectItem {
  label: string;
  value: string;
  key?: string;
}

interface EnvironmentSelectionProps {
  accessToken: string;
  cookie: string;
  onComplete: (apiKey: string, orgName: string, envName: string) => void;
  workspace?: string;
}

export const EnvironmentSelection: React.FC<EnvironmentSelectionProps> = ({
  accessToken,
  cookie,
  onComplete,
  workspace
}) => {
  // State management
  const [state, setState] = useState<'org' | 'project' | 'environment'>('org');
  const [orgs, setOrgs] = useState<SelectItem[]>([]);
  const [projects, setProjects] = useState<SelectItem[]>([]);
  const [environments, setEnvironments] = useState<SelectItem[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<SelectItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<SelectItem | null>(null);
  const [currentCookie, setCurrentCookie] = useState(cookie);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  /**
   * Fetch organizations on component mount
   * Handles workspace preselection if provided
   */
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setIsLoading(true);
        const { response } = await apiCall('v2/orgs', accessToken, currentCookie);
        
        const orgItems = response.map((org: any) => ({ 
          label: org.name, 
          value: org.id,
          key: org.key
        }));
        
        setOrgs(orgItems);

        // Auto-select organization if workspace is provided or only one exists
        if (workspace) {
          const selectedOrg = orgItems.find((org) => org.key === workspace);
          if (selectedOrg) {
            handleOrgSelect(selectedOrg);
          }
        } else if (response.length === 1) {
          handleOrgSelect(orgItems[0]);
        }
      } catch (error) {
        setError('Failed to fetch organizations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgs();
  }, [accessToken, currentCookie, workspace]);

  /**
   * Handles organization selection and fetches projects
   */
  const handleOrgSelect = async (org: SelectItem) => {
    try {
      setSelectedOrg(org);
      setIsLoading(true);

      const { headers } = await apiCall(
        `v2/auth/switch_org/${org.value}`,
        accessToken,
        currentCookie,
        'POST'
      );

      const newCookie = headers.getSetCookie()?.[0] || currentCookie;
      setCurrentCookie(newCookie);

      const { response: projectsData } = await apiCall(
        'v2/projects',
        accessToken,
        newCookie
      );

      const projectItems = projectsData.map((project: any) => ({
        label: project.name,
        value: project.id,
      }));

      setProjects(projectItems);
      setState('project');

      if (projectItems.length === 1) {
        handleProjectSelect(projectItems[0]);
      }
    } catch (error) {
      setError('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles project selection and fetches environments
   */
  const handleProjectSelect = async (project: SelectItem) => {
    try {
      setSelectedProject(project);
      setIsLoading(true);

      const { response: environmentsData } = await apiCall(
        `v2/projects/${project.value}/envs`,
        accessToken,
        currentCookie
      );

      setEnvironments(
        environmentsData.map((env: any) => ({
          label: env.name,
          value: env.id,
        }))
      );
      setState('environment');
    } catch (error) {
      setError('Failed to fetch environments');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles environment selection and completes the flow
   */
  const handleEnvironmentSelect = async (environment: SelectItem) => {
    try {
      setIsLoading(true);
      const { response } = await apiCall(
        `v2/api-key/${selectedProject?.value}/${environment.value}`,
        accessToken,
        currentCookie
      );
      onComplete(response.secret, selectedOrg?.label || '', environment.label);
    } catch (error) {
      setError('Failed to fetch API key');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  if (isLoading) {
    return (
      <Text>
        <Spinner type="dots" /> Loading...
      </Text>
    );
  }

  return (
    <>
      {state === 'org' && orgs.length > 0 && (
        <>
          <Text>Select an organization</Text>
          <SelectInput items={orgs} onSelect={handleOrgSelect} />
        </>
      )}
      {state === 'project' && projects.length > 0 && (
        <>
          <Text>Select a project</Text>
          <SelectInput items={projects} onSelect={handleProjectSelect} />
        </>
      )}
      {state === 'environment' && environments.length > 0 && (
        <>
          <Text>Select an environment</Text>
          <SelectInput items={environments} onSelect={handleEnvironmentSelect} />
        </>
      )}
    </>
  );
};